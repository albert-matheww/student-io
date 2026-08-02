"""XP, levels, and achievements. Kept deliberately understated — no
confetti-per-click — a level-up is just a milestone the student crosses by
studying consistently.
"""

from dataclasses import dataclass
from typing import Callable

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import Achievement, ConfidenceScore, Flashcard, QuizAttempt, User

XP_PER_LEVEL = 250


def xp_progress(xp: int) -> dict:
    level = xp // XP_PER_LEVEL + 1
    into_level = xp % XP_PER_LEVEL
    return {"level": level, "xp_into_level": into_level, "xp_for_next_level": XP_PER_LEVEL}


def award_xp(db: Session, user: User, amount: int) -> None:
    user.xp += amount
    user.level = xp_progress(user.xp)["level"]
    db.commit()


@dataclass(frozen=True)
class AchievementDef:
    code: str
    title: str
    description: str
    check: Callable[[Session, User], bool]


def _has_completed_lesson(db: Session, user: User) -> bool:
    from app.models import Course, Lesson, Module

    return (
        db.query(Lesson)
        .join(Module, Lesson.module_id == Module.id)
        .join(Course, Module.course_id == Course.id)
        .filter(Course.user_id == user.id, Lesson.is_completed.is_(True))
        .first()
        is not None
    )


def _quiz_correct_count(db: Session, user: User) -> int:
    return (
        db.query(func.count(QuizAttempt.id))
        .filter(QuizAttempt.user_id == user.id, QuizAttempt.is_correct.is_(True))
        .scalar()
        or 0
    )


def _mastered_count(db: Session, user: User) -> int:
    return (
        db.query(func.count(ConfidenceScore.id))
        .filter(ConfidenceScore.user_id == user.id, ConfidenceScore.is_mastered.is_(True))
        .scalar()
        or 0
    )


def _flashcards_reviewed(db: Session, user: User) -> int:
    from app.models import Course, Lesson, Module

    return (
        db.query(func.sum(Flashcard.times_reviewed))
        .join(Lesson, Flashcard.lesson_id == Lesson.id)
        .join(Module, Lesson.module_id == Module.id)
        .join(Course, Module.course_id == Course.id)
        .filter(Course.user_id == user.id)
        .scalar()
        or 0
    )


ACHIEVEMENTS: list[AchievementDef] = [
    AchievementDef("first_lesson", "First Step", "Complete your first lesson", _has_completed_lesson),
    AchievementDef("streak_3", "Building Momentum", "Reach a 3-day study streak", lambda db, u: u.current_streak >= 3),
    AchievementDef("streak_7", "One Week Strong", "Reach a 7-day study streak", lambda db, u: u.current_streak >= 7),
    AchievementDef("streak_30", "Unstoppable", "Reach a 30-day study streak", lambda db, u: u.current_streak >= 30),
    AchievementDef("quiz_10", "Sharp Mind", "Answer 10 quiz questions correctly", lambda db, u: _quiz_correct_count(db, u) >= 10),
    AchievementDef("mastery_1", "Topic Mastered", "Master your first topic", lambda db, u: _mastered_count(db, u) >= 1),
    AchievementDef("mastery_5", "Deep Understanding", "Master 5 topics", lambda db, u: _mastered_count(db, u) >= 5),
    AchievementDef("flashcards_25", "Card Counter", "Review 25 flashcards", lambda db, u: _flashcards_reviewed(db, u) >= 25),
]


def check_and_award_achievements(db: Session, user: User) -> list[AchievementDef]:
    """Evaluates every achievement not yet earned; persists and returns the
    newly-earned ones so the caller can surface them (e.g. as a toast)."""
    earned_codes = {a.code for a in db.query(Achievement.code).filter(Achievement.user_id == user.id).all()}
    newly_earned = []
    for definition in ACHIEVEMENTS:
        if definition.code in earned_codes:
            continue
        if definition.check(db, user):
            db.add(Achievement(user_id=user.id, code=definition.code))
            newly_earned.append(definition)
    if newly_earned:
        db.commit()
    return newly_earned
