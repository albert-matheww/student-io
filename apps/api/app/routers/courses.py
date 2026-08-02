from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import Integer, cast, func
from sqlalchemy.orm import Session, selectinload

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models import (
    ConfidenceScore,
    Course,
    Flashcard,
    Lesson,
    Module,
    QuizAttempt,
    QuizQuestion,
    Resource,
    RevisionSchedule,
    User,
)
from app.schemas import (
    AnalyticsOut,
    CourseDetailOut,
    CourseFlashcardsOut,
    CourseOut,
    CourseQuizzesOut,
    DailyActivityOut,
    DashboardStatsOut,
    ExamDayItemOut,
    ExamDayOut,
    ExamPlanIn,
    ExamPlanOut,
    LessonFlashcardsOut,
    LessonQuizSummaryOut,
    LessonSummaryOut,
    ResourceOut,
)
from app.services.exam_planner import build_schedule

router = APIRouter(prefix="/courses", tags=["courses"])


@router.get("", response_model=list[CourseOut])
def list_courses(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(Course).filter(Course.user_id == user.id).order_by(Course.created_at.desc()).all()


def _get_owned_course(course_id: str, db: Session, user: User) -> Course:
    course = (
        db.query(Course)
        .options(selectinload(Course.modules).selectinload(Module.lessons))
        .filter(Course.id == course_id, Course.user_id == user.id)
        .first()
    )
    if course is None:
        raise HTTPException(404, "Course not found")
    return course


@router.get("/{course_id}", response_model=CourseDetailOut)
def get_course(course_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return _get_owned_course(course_id, db, user)


@router.get("/{course_id}/dashboard", response_model=DashboardStatsOut)
def get_dashboard(course_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    course = _get_owned_course(course_id, db, user)
    all_lessons = [lesson for module in course.modules for lesson in module.lessons]

    total = len(all_lessons)
    completed = sum(1 for lesson in all_lessons if lesson.is_completed)
    completion_percent = (completed / total * 100) if total else 0.0

    lesson_ids = [lesson.id for lesson in all_lessons]
    accuracy_row = (
        db.query(
            func.count(QuizAttempt.id),
            func.sum(cast(QuizAttempt.is_correct, Integer)),
        )
        .join(QuizQuestion, QuizAttempt.question_id == QuizQuestion.id)
        .filter(QuizQuestion.lesson_id.in_(lesson_ids), QuizAttempt.user_id == user.id)
        .first()
        if lesson_ids
        else (0, 0)
    )
    total_attempts = accuracy_row[0] or 0
    correct_attempts = accuracy_row[1] or 0
    quiz_accuracy = (correct_attempts / total_attempts * 100) if total_attempts else 0.0

    revision_due_count = (
        db.query(RevisionSchedule)
        .filter(RevisionSchedule.user_id == user.id, RevisionSchedule.lesson_id.in_(lesson_ids))
        .count()
        if lesson_ids
        else 0
    )

    weak_topics = sorted(
        [lesson for lesson in all_lessons if lesson.is_completed],
        key=lambda lesson: lesson.confidence_score,
    )[:5]
    upcoming = [lesson for lesson in all_lessons if not lesson.is_completed][:5]

    exam_readiness = round((completion_percent * 0.5) + (quiz_accuracy * 0.5), 1)

    return DashboardStatsOut(
        course_id=course.id,
        completion_percent=round(completion_percent, 1),
        quiz_accuracy=round(quiz_accuracy, 1),
        exam_readiness=exam_readiness,
        study_streak=user.current_streak,
        revision_due_count=revision_due_count,
        weak_topics=[LessonSummaryOut.model_validate(lesson) for lesson in weak_topics],
        upcoming_lessons=[LessonSummaryOut.model_validate(lesson) for lesson in upcoming],
    )


@router.put("/{course_id}/exam-plan", response_model=ExamPlanOut)
def set_exam_plan(
    course_id: str,
    payload: ExamPlanIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    course = _get_owned_course(course_id, db, user)
    course.exam_date = payload.exam_date
    course.target_grade = payload.target_grade
    course.daily_study_minutes = payload.daily_study_minutes
    db.commit()
    return _build_exam_plan_out(course)


@router.get("/{course_id}/exam-plan", response_model=ExamPlanOut)
def get_exam_plan(course_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    course = _get_owned_course(course_id, db, user)
    return _build_exam_plan_out(course)


def _build_exam_plan_out(course: Course) -> ExamPlanOut:
    all_lessons = [lesson for module in course.modules for lesson in module.lessons]
    lessons_remaining = sum(1 for l in all_lessons if not l.is_completed)

    if course.exam_date is None:
        return ExamPlanOut(
            exam_date=None,
            target_grade=course.target_grade,
            daily_study_minutes=course.daily_study_minutes,
            days_until_exam=None,
            lessons_remaining=lessons_remaining,
            on_track=True,
            schedule=[],
        )

    raw_schedule, days_until_exam = build_schedule(course, course.daily_study_minutes or 60)
    schedule = [
        ExamDayOut(
            day=day["day"],
            items=[
                ExamDayItemOut(
                    lesson_id=item["lesson"].id,
                    title=item["lesson"].title,
                    module_title=item["lesson"].module.title,
                    estimated_minutes=item["minutes"],
                    kind=item["kind"],
                )
                for item in day["items"]
            ],
            is_buffer_day=day["is_buffer_day"],
            is_mock_test_day=day["is_mock_test_day"],
        )
        for day in raw_schedule
    ]
    total_new_lesson_slots = sum(1 for day in raw_schedule for item in day["items"] if item["kind"] == "new")

    return ExamPlanOut(
        exam_date=course.exam_date,
        target_grade=course.target_grade,
        daily_study_minutes=course.daily_study_minutes,
        days_until_exam=days_until_exam,
        lessons_remaining=lessons_remaining,
        on_track=total_new_lesson_slots >= lessons_remaining,
        schedule=schedule,
    )


@router.get("/{course_id}/flashcards", response_model=CourseFlashcardsOut)
def get_course_flashcards(course_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    course = _get_owned_course(course_id, db, user)
    lessons = []
    for module in course.modules:
        for lesson in module.lessons:
            cards = db.query(Flashcard).filter(Flashcard.lesson_id == lesson.id).all()
            if cards:
                lessons.append(
                    LessonFlashcardsOut(
                        lesson_id=lesson.id,
                        lesson_title=lesson.title,
                        lesson_slug=lesson.slug,
                        module_title=module.title,
                        flashcards=cards,
                    )
                )
    return CourseFlashcardsOut(lessons=lessons)


@router.get("/{course_id}/quizzes", response_model=CourseQuizzesOut)
def get_course_quizzes(course_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    course = _get_owned_course(course_id, db, user)
    lessons = []
    for module in course.modules:
        for lesson in module.lessons:
            question_count = db.query(QuizQuestion).filter(QuizQuestion.lesson_id == lesson.id).count()
            if question_count == 0:
                continue
            attempt_row = (
                db.query(func.count(QuizAttempt.id), func.sum(cast(QuizAttempt.is_correct, Integer)))
                .join(QuizQuestion, QuizAttempt.question_id == QuizQuestion.id)
                .filter(QuizQuestion.lesson_id == lesson.id, QuizAttempt.user_id == user.id)
                .first()
            )
            attempted_count = attempt_row[0] or 0
            correct = attempt_row[1] or 0
            accuracy = round(correct / attempted_count * 100, 1) if attempted_count else None
            lessons.append(
                LessonQuizSummaryOut(
                    lesson_id=lesson.id,
                    lesson_title=lesson.title,
                    lesson_slug=lesson.slug,
                    module_title=module.title,
                    question_count=question_count,
                    attempted_count=attempted_count,
                    accuracy=accuracy,
                )
            )
    return CourseQuizzesOut(lessons=lessons)


@router.get("/{course_id}/resources", response_model=list[ResourceOut])
def list_course_resources(course_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _get_owned_course(course_id, db, user)
    return (
        db.query(Resource)
        .filter(Resource.course_id == course_id)
        .order_by(Resource.created_at.desc())
        .all()
    )


@router.get("/{course_id}/analytics", response_model=AnalyticsOut)
def get_course_analytics(course_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    course = _get_owned_course(course_id, db, user)
    all_lessons = [lesson for module in course.modules for lesson in module.lessons]
    lesson_ids = [lesson.id for lesson in all_lessons]
    completed = [lesson for lesson in all_lessons if lesson.is_completed]

    hours_studied = round(sum((lesson.estimated_minutes or 0) for lesson in completed) / 60, 1)

    scores = (
        db.query(ConfidenceScore)
        .filter(ConfidenceScore.user_id == user.id, ConfidenceScore.lesson_id.in_(lesson_ids))
        .all()
        if lesson_ids
        else []
    )
    retention_percent = round(sum(s.score for s in scores) / len(scores), 1) if scores else 0.0

    accuracy_row = (
        db.query(func.count(QuizAttempt.id), func.sum(cast(QuizAttempt.is_correct, Integer)))
        .join(QuizQuestion, QuizAttempt.question_id == QuizQuestion.id)
        .filter(QuizQuestion.lesson_id.in_(lesson_ids), QuizAttempt.user_id == user.id)
        .first()
        if lesson_ids
        else (0, 0)
    )
    total_attempts = accuracy_row[0] or 0
    correct_attempts = accuracy_row[1] or 0
    quiz_accuracy = round(correct_attempts / total_attempts * 100, 1) if total_attempts else 0.0

    revision_schedules = (
        db.query(RevisionSchedule)
        .filter(RevisionSchedule.user_id == user.id, RevisionSchedule.lesson_id.in_(lesson_ids))
        .all()
        if lesson_ids
        else []
    )
    revision_completion_percent = (
        round(sum(1 for r in revision_schedules if r.last_completed_at) / len(revision_schedules) * 100, 1)
        if revision_schedules
        else 0.0
    )

    weak_area_count = sum(1 for lesson in completed if lesson.confidence_score < 60)
    completion_percent = (len(completed) / len(all_lessons) * 100) if all_lessons else 0.0
    exam_readiness = round((completion_percent * 0.5) + (quiz_accuracy * 0.5), 1)

    activity_counts: dict[date, int] = {}
    attempts = (
        db.query(QuizAttempt.answered_at)
        .join(QuizQuestion, QuizAttempt.question_id == QuizQuestion.id)
        .filter(QuizQuestion.lesson_id.in_(lesson_ids), QuizAttempt.user_id == user.id)
        .all()
        if lesson_ids
        else []
    )
    for (answered_at,) in attempts:
        day = answered_at.date()
        activity_counts[day] = activity_counts.get(day, 0) + 1

    today = date.today()
    daily_activity = [
        DailyActivityOut(day=today - timedelta(days=offset), count=activity_counts.get(today - timedelta(days=offset), 0))
        for offset in range(83, -1, -1)
    ]

    return AnalyticsOut(
        hours_studied=hours_studied,
        topics_learned=len(completed),
        retention_percent=retention_percent,
        quiz_accuracy=quiz_accuracy,
        revision_completion_percent=revision_completion_percent,
        weak_area_count=weak_area_count,
        exam_readiness=exam_readiness,
        daily_activity=daily_activity,
    )
