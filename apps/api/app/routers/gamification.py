from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models import Achievement, User
from app.schemas import AchievementOut, GamificationSummaryOut
from app.services.gamification import ACHIEVEMENTS, xp_progress

router = APIRouter(prefix="/gamification", tags=["gamification"])


@router.get("/summary", response_model=GamificationSummaryOut)
def get_gamification_summary(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    earned = {
        a.code: a.earned_at
        for a in db.query(Achievement).filter(Achievement.user_id == user.id).all()
    }
    progress = xp_progress(user.xp)

    achievements = [
        AchievementOut(
            code=defn.code,
            title=defn.title,
            description=defn.description,
            earned=defn.code in earned,
            earned_at=earned.get(defn.code),
        )
        for defn in ACHIEVEMENTS
    ]

    return GamificationSummaryOut(
        xp=user.xp,
        level=progress["level"],
        xp_into_level=progress["xp_into_level"],
        xp_for_next_level=progress["xp_for_next_level"],
        current_streak=user.current_streak,
        longest_streak=user.longest_streak,
        achievements=achievements,
    )
