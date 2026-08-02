"""Recomputes a lesson's AI Confidence Score from quiz accuracy, flashcard
review outcomes, and spaced-repetition progress — the signal the dashboard
uses to surface weak topics and decide when a topic counts as "Mastered".
"""

from sqlalchemy import Integer, cast, func
from sqlalchemy.orm import Session

from app.models import (
    ConfidenceScore,
    Flashcard,
    Lesson,
    QuizAttempt,
    QuizQuestion,
    RevisionSchedule,
)
from app.services.spaced_repetition import REVISION_INTERVALS_DAYS

MASTERY_THRESHOLD = 85.0
REVISION_LADDER_LENGTH = len(REVISION_INTERVALS_DAYS)


def recompute_confidence(db: Session, user_id: str, lesson_id: str) -> ConfidenceScore:
    total_attempts, correct_attempts = (
        db.query(func.count(QuizAttempt.id), func.sum(cast(QuizAttempt.is_correct, Integer)))
        .join(QuizQuestion, QuizAttempt.question_id == QuizQuestion.id)
        .filter(QuizQuestion.lesson_id == lesson_id, QuizAttempt.user_id == user_id)
        .first()
    )
    quiz_accuracy = (correct_attempts or 0) / total_attempts * 100 if total_attempts else 0.0

    reviewed_cards = db.query(Flashcard).filter(
        Flashcard.lesson_id == lesson_id, Flashcard.times_reviewed > 0
    ).all()
    if reviewed_cards:
        good_count = sum(1 for c in reviewed_cards if c.last_quality in ("good", "easy"))
        flashcard_accuracy = good_count / len(reviewed_cards) * 100
    else:
        flashcard_accuracy = 0.0

    schedule = (
        db.query(RevisionSchedule)
        .filter(RevisionSchedule.user_id == user_id, RevisionSchedule.lesson_id == lesson_id)
        .first()
    )
    revision_success_rate = (
        min(1.0, schedule.stage / REVISION_LADDER_LENGTH) * 100 if schedule else 0.0
    )

    has_quiz_signal = total_attempts > 0
    has_flashcard_signal = len(reviewed_cards) > 0
    weighted_score = (
        quiz_accuracy * 0.5 + flashcard_accuracy * 0.3 + revision_success_rate * 0.2
        if (has_quiz_signal or has_flashcard_signal)
        else 0.0
    )

    score = db.query(ConfidenceScore).filter(
        ConfidenceScore.user_id == user_id, ConfidenceScore.lesson_id == lesson_id
    ).first()
    if score is None:
        score = ConfidenceScore(user_id=user_id, lesson_id=lesson_id)
        db.add(score)

    score.quiz_accuracy = quiz_accuracy
    score.flashcard_accuracy = flashcard_accuracy
    score.revision_success_rate = revision_success_rate
    score.score = round(weighted_score, 1)
    score.is_mastered = weighted_score >= MASTERY_THRESHOLD

    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if lesson:
        lesson.confidence_score = score.score

    db.commit()
    db.refresh(score)
    return score
