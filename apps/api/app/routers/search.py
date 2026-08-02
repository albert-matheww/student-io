from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models import Course, Flashcard, Lesson, Module, QuizQuestion, Resource, User
from app.schemas import SearchResponseOut, SearchResultOut

router = APIRouter(tags=["search"])


@router.get("/courses/{course_id}/search", response_model=SearchResponseOut)
def search_course(
    course_id: str,
    q: str = "",
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Keyword search across a course's lessons, flashcards, quiz questions,
    and library resources. Scoped to the requesting user's own course."""
    query = q.strip()
    if len(query) < 2:
        return SearchResponseOut(results=[])

    like = f"%{query}%"
    results: list[SearchResultOut] = []

    lessons = (
        db.query(Lesson, Module)
        .join(Module, Lesson.module_id == Module.id)
        .join(Course, Module.course_id == Course.id)
        .filter(Course.id == course_id, Course.user_id == user.id)
        .filter((Lesson.title.ilike(like)) | (Lesson.overview.ilike(like)))
        .limit(8)
        .all()
    )
    for lesson, module in lessons:
        results.append(
            SearchResultOut(
                kind="lesson", id=lesson.id, title=lesson.title, subtitle=module.title, lesson_slug=lesson.slug
            )
        )

    flashcards = (
        db.query(Flashcard, Lesson)
        .join(Lesson, Flashcard.lesson_id == Lesson.id)
        .join(Module, Lesson.module_id == Module.id)
        .join(Course, Module.course_id == Course.id)
        .filter(Course.id == course_id, Course.user_id == user.id)
        .filter((Flashcard.front.ilike(like)) | (Flashcard.back.ilike(like)))
        .limit(6)
        .all()
    )
    for card, lesson in flashcards:
        results.append(
            SearchResultOut(
                kind="flashcard", id=card.id, title=card.front, subtitle=lesson.title, lesson_slug=lesson.slug
            )
        )

    questions = (
        db.query(QuizQuestion, Lesson)
        .join(Lesson, QuizQuestion.lesson_id == Lesson.id)
        .join(Module, Lesson.module_id == Module.id)
        .join(Course, Module.course_id == Course.id)
        .filter(Course.id == course_id, Course.user_id == user.id)
        .filter(QuizQuestion.prompt.ilike(like))
        .limit(6)
        .all()
    )
    for question, lesson in questions:
        results.append(
            SearchResultOut(
                kind="quiz", id=question.id, title=question.prompt, subtitle=lesson.title, lesson_slug=lesson.slug
            )
        )

    resources = (
        db.query(Resource)
        .filter(Resource.course_id == course_id, Resource.filename.ilike(like))
        .limit(6)
        .all()
    )
    for resource in resources:
        results.append(
            SearchResultOut(
                kind="resource", id=resource.id, title=resource.filename, subtitle=resource.status.value, lesson_slug=""
            )
        )

    return SearchResponseOut(results=results)
