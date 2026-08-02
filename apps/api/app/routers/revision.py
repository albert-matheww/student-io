from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models import Course, Lesson, Module, RevisionSchedule, User
from app.schemas import (
    AchievementOut,
    RevisionCompleteIn,
    RevisionCompleteOut,
    RevisionItemOut,
    RevisionQueueOut,
)
from app.services.confidence import recompute_confidence
from app.services.gamification import award_xp, check_and_award_achievements
from app.services.spaced_repetition import REVISION_INTERVALS_DAYS

router = APIRouter(tags=["revision"])


def _to_item(schedule: RevisionSchedule, lesson: Lesson, module: Module) -> RevisionItemOut:
    return RevisionItemOut(
        schedule_id=schedule.id,
        lesson_id=lesson.id,
        lesson_title=lesson.title,
        lesson_slug=lesson.slug,
        module_title=module.title,
        due_date=schedule.due_date,
        stage=schedule.stage,
        stage_count=len(REVISION_INTERVALS_DAYS),
        confidence_score=lesson.confidence_score,
    )


@router.get("/courses/{course_id}/revision", response_model=RevisionQueueOut)
def get_revision_queue(
    course_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rows = (
        db.query(RevisionSchedule, Lesson, Module)
        .join(Lesson, RevisionSchedule.lesson_id == Lesson.id)
        .join(Module, Lesson.module_id == Module.id)
        .join(Course, Module.course_id == Course.id)
        .filter(
            RevisionSchedule.user_id == user.id,
            Course.id == course_id,
            Course.user_id == user.id,
        )
        .order_by(RevisionSchedule.due_date.asc())
        .all()
    )

    today = date.today()
    overdue, due_today, upcoming = [], [], []
    for schedule, lesson, module in rows:
        item = _to_item(schedule, lesson, module)
        if schedule.due_date < today:
            overdue.append(item)
        elif schedule.due_date == today:
            due_today.append(item)
        else:
            upcoming.append(item)

    return RevisionQueueOut(overdue=overdue, due_today=due_today, upcoming=upcoming)


@router.post("/revision/{schedule_id}/complete", response_model=RevisionCompleteOut)
def complete_revision(
    schedule_id: str,
    payload: RevisionCompleteIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    schedule = (
        db.query(RevisionSchedule)
        .filter(RevisionSchedule.id == schedule_id, RevisionSchedule.user_id == user.id)
        .first()
    )
    if schedule is None:
        raise HTTPException(404, "Revision schedule not found")

    if payload.success:
        schedule.stage = min(schedule.stage + 1, len(REVISION_INTERVALS_DAYS) - 1)
        interval = REVISION_INTERVALS_DAYS[schedule.stage]
    else:
        schedule.stage = 0
        interval = REVISION_INTERVALS_DAYS[0]

    schedule.due_date = date.today() + timedelta(days=interval)
    schedule.last_completed_at = datetime.utcnow()
    db.commit()

    score = recompute_confidence(db, user.id, schedule.lesson_id)
    award_xp(db, user, 10 if payload.success else 2)
    new_achievements = check_and_award_achievements(db, user)

    return RevisionCompleteOut(
        stage=schedule.stage,
        due_date=schedule.due_date,
        mastered=score.is_mastered,
        new_achievements=[
            AchievementOut(code=a.code, title=a.title, description=a.description, earned=True, earned_at=None)
            for a in new_achievements
        ],
    )
