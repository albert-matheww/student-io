from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session, selectinload

from app.core.auth import get_current_user
from app.core.database import get_db
from app.core.limiter import limiter
from app.models import (
    ConfidenceScore,
    Course,
    Flashcard,
    Lesson,
    Module,
    QuizAttempt,
    QuizQuestion,
    RevisionSchedule,
    TutorMessage,
    User,
)
from app.schemas import (
    AchievementOut,
    ConceptConnectionOut,
    LessonCompleteOut,
    LessonDetailOut,
    PrerequisiteOut,
    QuizAttemptIn,
    QuizAttemptOut,
    TutorAskIn,
    TutorAskOut,
    TutorMessageOut,
    VideoOut,
)
from app.services.confidence import recompute_confidence
from app.services.gamification import award_xp, check_and_award_achievements
from app.services.spaced_repetition import REVISION_INTERVALS_DAYS
from app.services.lesson_content import (
    answer_tutor_question,
    generate_flashcards,
    generate_lesson_notes,
    generate_quiz_questions,
)
from app.services.youtube import recommend_videos

router = APIRouter(tags=["lessons"])


def _get_owned_lesson_by_slug(course_id: str, slug: str, db: Session, user: User) -> Lesson:
    lesson = (
        db.query(Lesson)
        .join(Module, Lesson.module_id == Module.id)
        .join(Course, Module.course_id == Course.id)
        .options(selectinload(Lesson.flashcards), selectinload(Lesson.questions))
        .filter(Lesson.slug == slug, Course.id == course_id, Course.user_id == user.id)
        .first()
    )
    if lesson is None:
        raise HTTPException(404, "Lesson not found")
    return lesson


@router.get("/courses/{course_id}/lessons/{slug}", response_model=LessonDetailOut)
@limiter.limit("30/minute")
def get_lesson(
    request: Request,
    course_id: str,
    slug: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    lesson = _get_owned_lesson_by_slug(course_id, slug, db, user)
    module = db.query(Module).filter(Module.id == lesson.module_id).first()
    course = db.query(Course).filter(Course.id == module.course_id).first()

    if lesson.content is None:
        notes = generate_lesson_notes(lesson.title, course.name)
        lesson.overview = notes.get("overview")
        lesson.content = notes
        db.commit()

    if not lesson.flashcards:
        for card in generate_flashcards(lesson.title, course.name):
            db.add(Flashcard(lesson_id=lesson.id, **card))
        db.commit()

    if not lesson.questions:
        for q in generate_quiz_questions(lesson.title, course.name):
            db.add(QuizQuestion(lesson_id=lesson.id, **q))
        db.commit()

    if lesson.recommended_videos is None:
        lesson.recommended_videos = recommend_videos(lesson.title, course.name)
        db.commit()

    prerequisites = []
    if lesson.prerequisite_lesson_ids:
        prereq_lessons = db.query(Lesson).filter(Lesson.id.in_(lesson.prerequisite_lesson_ids)).all()
        prerequisites = [
            PrerequisiteOut(
                id=p.id, title=p.title, slug=p.slug, is_completed=p.is_completed, estimated_minutes=p.estimated_minutes
            )
            for p in prereq_lessons
        ]

    related_concepts = []
    if lesson.related_lesson_ids:
        related = db.query(Lesson).filter(Lesson.id.in_(lesson.related_lesson_ids)).all()
        related_concepts = [
            ConceptConnectionOut(id=r.id, title=r.title, slug=r.slug, is_completed=r.is_completed) for r in related
        ]

    # "Unlocks": lessons in this course that list this lesson as a
    # prerequisite — the inverse edge, computed on the fly rather than
    # stored, since it's cheap and always stays in sync.
    unlocks = []
    candidates = db.query(Lesson).join(Module, Lesson.module_id == Module.id).filter(Module.course_id == course.id).all()
    for candidate in candidates:
        if candidate.prerequisite_lesson_ids and lesson.id in candidate.prerequisite_lesson_ids:
            unlocks.append(
                ConceptConnectionOut(
                    id=candidate.id, title=candidate.title, slug=candidate.slug, is_completed=candidate.is_completed
                )
            )

    db.refresh(lesson)
    return LessonDetailOut(
        id=lesson.id,
        title=lesson.title,
        slug=lesson.slug,
        overview=lesson.overview,
        content=lesson.content,
        origin=lesson.origin,
        source_citations=lesson.source_citations,
        difficulty=lesson.difficulty,
        estimated_minutes=lesson.estimated_minutes,
        is_completed=lesson.is_completed,
        confidence_score=lesson.confidence_score,
        flashcards=lesson.flashcards,
        questions=lesson.questions,
        prerequisites=prerequisites,
        related_concepts=related_concepts,
        unlocks=unlocks,
        recommended_videos=[VideoOut(**v) for v in lesson.recommended_videos or []],
        module_id=lesson.module_id,
        course_id=course.id,
        course_name=course.name,
    )


@router.post("/lessons/{lesson_id}/complete", response_model=LessonCompleteOut)
def complete_lesson(lesson_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if lesson is None:
        raise HTTPException(404, "Lesson not found")

    lesson.is_completed = True

    schedule = (
        db.query(RevisionSchedule)
        .filter(RevisionSchedule.user_id == user.id, RevisionSchedule.lesson_id == lesson_id)
        .first()
    )
    due = date.today() + timedelta(days=REVISION_INTERVALS_DAYS[0])
    if schedule is None:
        db.add(RevisionSchedule(user_id=user.id, lesson_id=lesson_id, stage=0, due_date=due))
    else:
        schedule.stage = 0
        schedule.due_date = due

    score = (
        db.query(ConfidenceScore)
        .filter(ConfidenceScore.user_id == user.id, ConfidenceScore.lesson_id == lesson_id)
        .first()
    )
    if score is None:
        db.add(ConfidenceScore(user_id=user.id, lesson_id=lesson_id, score=40.0))

    today = date.today()
    if user.last_study_date != today:
        user.current_streak = user.current_streak + 1 if user.last_study_date == today - timedelta(days=1) else 1
        user.longest_streak = max(user.longest_streak, user.current_streak)
        user.last_study_date = today

    db.commit()
    award_xp(db, user, 20)
    new_achievements = check_and_award_achievements(db, user)

    return LessonCompleteOut(
        new_achievements=[
            AchievementOut(code=a.code, title=a.title, description=a.description, earned=True, earned_at=None)
            for a in new_achievements
        ]
    )


@router.post("/questions/{question_id}/attempts", response_model=QuizAttemptOut)
def submit_quiz_attempt(
    question_id: str,
    payload: QuizAttemptIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    question = db.query(QuizQuestion).filter(QuizQuestion.id == question_id).first()
    if question is None:
        raise HTTPException(404, "Question not found")

    is_correct = payload.answer.strip().lower() == question.correct_answer.strip().lower()
    db.add(
        QuizAttempt(
            question_id=question_id,
            user_id=user.id,
            submitted_answer=payload.answer,
            is_correct=is_correct,
        )
    )
    db.commit()
    recompute_confidence(db, user.id, question.lesson_id)
    award_xp(db, user, 5 if is_correct else 1)
    new_achievements = check_and_award_achievements(db, user)

    return QuizAttemptOut(
        is_correct=is_correct,
        correct_answer=question.correct_answer,
        explanation=question.explanation,
        new_achievements=[
            AchievementOut(code=a.code, title=a.title, description=a.description, earned=True, earned_at=None)
            for a in new_achievements
        ],
    )


@router.get("/lessons/{lesson_id}/messages", response_model=list[TutorMessageOut])
def get_tutor_messages(lesson_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return (
        db.query(TutorMessage)
        .filter(TutorMessage.lesson_id == lesson_id, TutorMessage.user_id == user.id)
        .order_by(TutorMessage.created_at.asc())
        .all()
    )


def _build_student_context(db: Session, user: User) -> str | None:
    """Summarizes what the tutor should already know about this student —
    weak and mastered topics across every course — so explanations adapt
    instead of repeating a generic script each session."""
    scores = (
        db.query(ConfidenceScore, Lesson)
        .join(Lesson, ConfidenceScore.lesson_id == Lesson.id)
        .filter(ConfidenceScore.user_id == user.id)
        .all()
    )
    if not scores:
        return None

    weak = [lesson.title for score, lesson in scores if score.score < 60][:5]
    mastered = [lesson.title for score, lesson in scores if score.is_mastered][:5]

    parts = []
    if user.learning_style:
        parts.append(f"Prefers a {user.learning_style.value} learning style.")
    if weak:
        parts.append(f"Currently struggling with: {', '.join(weak)}.")
    if mastered:
        parts.append(f"Has already mastered: {', '.join(mastered)}.")
    return " ".join(parts) or None


@router.post("/lessons/{lesson_id}/ask", response_model=TutorAskOut)
@limiter.limit("20/minute")
def ask_tutor(
    request: Request,
    lesson_id: str,
    payload: TutorAskIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if lesson is None:
        raise HTTPException(404, "Lesson not found")
    module = db.query(Module).filter(Module.id == lesson.module_id).first()
    course = db.query(Course).filter(Course.id == module.course_id).first()

    history = (
        db.query(TutorMessage)
        .filter(TutorMessage.lesson_id == lesson_id, TutorMessage.user_id == user.id)
        .order_by(TutorMessage.created_at.asc())
        .all()
    )
    history_payload = [{"role": m.role, "content": m.content} for m in history[-10:]]
    student_context = _build_student_context(db, user)

    context = lesson.overview or ""
    answer = answer_tutor_question(
        payload.question, lesson.title, course.name, context, history_payload, student_context
    )

    db.add(TutorMessage(user_id=user.id, lesson_id=lesson_id, role="user", content=payload.question))
    db.add(TutorMessage(user_id=user.id, lesson_id=lesson_id, role="assistant", content=answer))
    db.commit()

    return TutorAskOut(answer=answer)
