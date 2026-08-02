from datetime import date, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models import Flashcard, User
from app.services.confidence import recompute_confidence
from app.services.gamification import award_xp, check_and_award_achievements

router = APIRouter(prefix="/flashcards", tags=["flashcards"])

Quality = Literal["again", "hard", "good", "easy"]
_QUALITY_SCORE = {"again": 0, "hard": 3, "good": 4, "easy": 5}


class FlashcardReviewIn(BaseModel):
    quality: Quality


class FlashcardReviewOut(BaseModel):
    interval_days: int
    due_at: date
    ease_factor: float


@router.post("/{flashcard_id}/review", response_model=FlashcardReviewOut)
def review_flashcard(
    flashcard_id: str,
    payload: FlashcardReviewIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Simplified SM-2 spaced repetition — the same 'again/hard/good/easy'
    rating pattern used by Anki, driving each card's next-due date."""
    card = db.query(Flashcard).filter(Flashcard.id == flashcard_id).first()
    if card is None:
        raise HTTPException(404, "Flashcard not found")

    quality = _QUALITY_SCORE[payload.quality]

    if quality < 3:
        card.repetitions = 0
        card.interval_days = 1
    else:
        if card.repetitions == 0:
            card.interval_days = 1
        elif card.repetitions == 1:
            card.interval_days = 6
        else:
            card.interval_days = round(card.interval_days * card.ease_factor)
        card.repetitions += 1

    card.ease_factor = max(
        1.3, card.ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    )
    card.due_at = date.today() + timedelta(days=card.interval_days)
    card.times_reviewed += 1
    card.last_quality = payload.quality
    db.commit()

    recompute_confidence(db, user.id, card.lesson_id)
    award_xp(db, user, 2)
    check_and_award_achievements(db, user)

    return FlashcardReviewOut(
        interval_days=card.interval_days, due_at=card.due_at, ease_factor=round(card.ease_factor, 2)
    )
