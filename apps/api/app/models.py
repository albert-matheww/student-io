import enum
import uuid
from datetime import date, datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base


def uuid_pk() -> Mapped[str]:
    return mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))


class LearningStyle(str, enum.Enum):
    visual = "visual"
    reading = "reading"
    practical = "practical"
    mixed = "mixed"


class DifficultyPreference(str, enum.Enum):
    beginner = "beginner"
    intermediate = "intermediate"
    exam_mode = "exam_mode"


class LearningMode(str, enum.Enum):
    guided = "guided"
    explore = "explore"
    exam = "exam"
    crash_course = "crash_course"


class ResourceStatus(str, enum.Enum):
    uploaded = "uploaded"
    processing = "processing"
    processed = "processed"
    failed = "failed"


class ResourceType(str, enum.Enum):
    pdf = "pdf"
    docx = "docx"
    ppt = "ppt"
    txt = "txt"
    image = "image"
    audio = "audio"
    video = "video"
    youtube = "youtube"
    drive_link = "drive_link"


class ContentOrigin(str, enum.Enum):
    uploaded = "uploaded"  # ✓ From Uploaded Material
    ai_supplement = "ai_supplement"  # ✓ AI Supplement (cited)


class FlashcardType(str, enum.Enum):
    basic = "basic"
    reverse = "reverse"
    image = "image"
    fill_blank = "fill_blank"
    formula = "formula"
    definition = "definition"


class QuestionType(str, enum.Enum):
    mcq = "mcq"
    true_false = "true_false"
    match = "match"
    fill_blank = "fill_blank"
    case_study = "case_study"
    coding = "coding"
    diagram = "diagram"
    subjective = "subjective"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    clerk_user_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str | None] = mapped_column(String(120))

    school: Mapped[str | None] = mapped_column(String(200))
    course_name: Mapped[str | None] = mapped_column(String(200))
    degree: Mapped[str | None] = mapped_column(String(120))
    semester: Mapped[str | None] = mapped_column(String(40))
    subjects: Mapped[list[str] | None] = mapped_column(JSON)

    learning_style: Mapped[LearningStyle | None] = mapped_column(Enum(LearningStyle))
    difficulty_preference: Mapped[DifficultyPreference | None] = mapped_column(
        Enum(DifficultyPreference)
    )
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False)

    xp: Mapped[int] = mapped_column(Integer, default=0)
    level: Mapped[int] = mapped_column(Integer, default=1)
    current_streak: Mapped[int] = mapped_column(Integer, default=0)
    longest_streak: Mapped[int] = mapped_column(Integer, default=0)
    last_study_date: Mapped[date | None] = mapped_column(Date)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    courses: Mapped[list["Course"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)

    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    learning_mode: Mapped[LearningMode] = mapped_column(Enum(LearningMode), default=LearningMode.guided)

    exam_date: Mapped[date | None] = mapped_column(Date)
    target_grade: Mapped[str | None] = mapped_column(String(20))
    daily_study_minutes: Mapped[int | None] = mapped_column(Integer)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="courses")
    modules: Mapped[list["Module"]] = relationship(
        back_populates="course", cascade="all, delete-orphan", order_by="Module.order_index"
    )
    resources: Mapped[list["Resource"]] = relationship(back_populates="course", cascade="all, delete-orphan")


class Module(Base):
    __tablename__ = "modules"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    course_id: Mapped[str] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"), index=True)

    title: Mapped[str] = mapped_column(String(200))
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    estimated_hours: Mapped[float | None] = mapped_column(Float)

    course: Mapped["Course"] = relationship(back_populates="modules")
    lessons: Mapped[list["Lesson"]] = relationship(
        back_populates="module", cascade="all, delete-orphan", order_by="Lesson.order_index"
    )


class Lesson(Base):
    __tablename__ = "lessons"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    module_id: Mapped[str] = mapped_column(ForeignKey("modules.id", ondelete="CASCADE"), index=True)

    title: Mapped[str] = mapped_column(String(200))
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    slug: Mapped[str] = mapped_column(String(220), index=True)

    overview: Mapped[str | None] = mapped_column(Text)
    content: Mapped[dict | None] = mapped_column(JSON)  # structured note blocks (definitions, callouts, tables…)
    origin: Mapped[ContentOrigin] = mapped_column(Enum(ContentOrigin), default=ContentOrigin.uploaded)
    source_citations: Mapped[list[dict] | None] = mapped_column(JSON)

    difficulty: Mapped[str | None] = mapped_column(String(20))
    estimated_minutes: Mapped[int | None] = mapped_column(Integer)

    prerequisite_lesson_ids: Mapped[list[str] | None] = mapped_column(JSON)
    related_lesson_ids: Mapped[list[str] | None] = mapped_column(JSON)
    recommended_videos: Mapped[list[dict] | None] = mapped_column(JSON)

    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    confidence_score: Mapped[float] = mapped_column(Float, default=0.0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    module: Mapped["Module"] = relationship(back_populates="lessons")
    flashcards: Mapped[list["Flashcard"]] = relationship(back_populates="lesson", cascade="all, delete-orphan")
    questions: Mapped[list["QuizQuestion"]] = relationship(back_populates="lesson", cascade="all, delete-orphan")


class Resource(Base):
    __tablename__ = "resources"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    course_id: Mapped[str] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"), index=True)

    filename: Mapped[str] = mapped_column(String(300))
    resource_type: Mapped[ResourceType] = mapped_column(Enum(ResourceType))
    storage_path: Mapped[str | None] = mapped_column(String(500))
    source_url: Mapped[str | None] = mapped_column(String(500))  # for youtube/drive links

    status: Mapped[ResourceStatus] = mapped_column(Enum(ResourceStatus), default=ResourceStatus.uploaded)
    processing_stage: Mapped[str | None] = mapped_column(String(60))
    error_message: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    course: Mapped["Course"] = relationship(back_populates="resources")
    chunks: Mapped[list["ResourceChunk"]] = relationship(back_populates="resource", cascade="all, delete-orphan")


class ResourceChunk(Base):
    """A chunk of extracted text + its embedding — the unit indexed for semantic search / RAG."""

    __tablename__ = "resource_chunks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    resource_id: Mapped[str] = mapped_column(ForeignKey("resources.id", ondelete="CASCADE"), index=True)

    content: Mapped[str] = mapped_column(Text)
    chunk_index: Mapped[int] = mapped_column(Integer, default=0)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(3072))  # text-embedding-3-large

    resource: Mapped["Resource"] = relationship(back_populates="chunks")


class Flashcard(Base):
    __tablename__ = "flashcards"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    lesson_id: Mapped[str] = mapped_column(ForeignKey("lessons.id", ondelete="CASCADE"), index=True)

    card_type: Mapped[FlashcardType] = mapped_column(Enum(FlashcardType), default=FlashcardType.basic)
    front: Mapped[str] = mapped_column(Text)
    back: Mapped[str] = mapped_column(Text)
    image_url: Mapped[str | None] = mapped_column(String(500))

    # spaced repetition state (SM-2 style)
    interval_days: Mapped[int] = mapped_column(Integer, default=0)
    ease_factor: Mapped[float] = mapped_column(Float, default=2.5)
    repetitions: Mapped[int] = mapped_column(Integer, default=0)
    due_at: Mapped[date | None] = mapped_column(Date)
    times_reviewed: Mapped[int] = mapped_column(Integer, default=0)
    last_quality: Mapped[str | None] = mapped_column(String(10))  # again|hard|good|easy

    lesson: Mapped["Lesson"] = relationship(back_populates="flashcards")


class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    lesson_id: Mapped[str] = mapped_column(ForeignKey("lessons.id", ondelete="CASCADE"), index=True)

    question_type: Mapped[QuestionType] = mapped_column(Enum(QuestionType))
    prompt: Mapped[str] = mapped_column(Text)
    options: Mapped[list[str] | None] = mapped_column(JSON)
    correct_answer: Mapped[str] = mapped_column(Text)
    explanation: Mapped[str | None] = mapped_column(Text)
    difficulty: Mapped[str] = mapped_column(String(20), default="medium")

    lesson: Mapped["Lesson"] = relationship(back_populates="questions")
    attempts: Mapped[list["QuizAttempt"]] = relationship(back_populates="question", cascade="all, delete-orphan")


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    question_id: Mapped[str] = mapped_column(ForeignKey("quiz_questions.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)

    submitted_answer: Mapped[str] = mapped_column(Text)
    is_correct: Mapped[bool] = mapped_column(Boolean)
    answered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    question: Mapped["QuizQuestion"] = relationship(back_populates="attempts")


class RevisionSchedule(Base):
    """Spaced-repetition revision queue for a lesson (1d / 3d / 7d / 14d / 30d)."""

    __tablename__ = "revision_schedules"
    __table_args__ = (UniqueConstraint("user_id", "lesson_id", name="uq_revision_user_lesson"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    lesson_id: Mapped[str] = mapped_column(ForeignKey("lessons.id", ondelete="CASCADE"), index=True)

    stage: Mapped[int] = mapped_column(Integer, default=0)  # index into [1, 3, 7, 14, 30] days
    due_date: Mapped[date] = mapped_column(Date)
    last_completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ConfidenceScore(Base):
    """Mastery/confidence score for a lesson, derived from quiz + flashcard + revision signals."""

    __tablename__ = "confidence_scores"
    __table_args__ = (UniqueConstraint("user_id", "lesson_id", name="uq_confidence_user_lesson"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    lesson_id: Mapped[str] = mapped_column(ForeignKey("lessons.id", ondelete="CASCADE"), index=True)

    score: Mapped[float] = mapped_column(Float, default=0.0)  # 0-100
    quiz_accuracy: Mapped[float | None] = mapped_column(Float)
    flashcard_accuracy: Mapped[float | None] = mapped_column(Float)
    revision_success_rate: Mapped[float | None] = mapped_column(Float)
    time_spent_minutes: Mapped[float | None] = mapped_column(Float)
    self_rating: Mapped[float | None] = mapped_column(Float)
    is_mastered: Mapped[bool] = mapped_column(Boolean, default=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Achievement(Base):
    """An earned achievement — see app/services/gamification.py for the
    catalog of achievement codes and their unlock conditions."""

    __tablename__ = "achievements"
    __table_args__ = (UniqueConstraint("user_id", "code", name="uq_achievement_user_code"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    code: Mapped[str] = mapped_column(String(60))
    earned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class TutorMessage(Base):
    """A single turn in the AI tutor conversation for one lesson. Persisted
    so the tutor has real cross-session memory — it re-reads this history
    (plus the student's confidence scores) before answering, rather than
    starting fresh every time the panel is reopened."""

    __tablename__ = "tutor_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    lesson_id: Mapped[str] = mapped_column(ForeignKey("lessons.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String(10))  # user | assistant
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
