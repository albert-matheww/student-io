from datetime import date, datetime

from pydantic import BaseModel, ConfigDict

from app.models import (
    ContentOrigin,
    DifficultyPreference,
    LearningMode,
    LearningStyle,
    ResourceStatus,
    ResourceType,
)


class OnboardingProfileIn(BaseModel):
    name: str
    school: str | None = None
    course_name: str | None = None
    degree: str | None = None
    semester: str | None = None
    subjects: list[str] = []
    learning_style: LearningStyle | None = None
    difficulty_preference: DifficultyPreference | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    name: str | None
    school: str | None
    course_name: str | None
    degree: str | None
    semester: str | None
    subjects: list[str] | None
    learning_style: LearningStyle | None
    difficulty_preference: DifficultyPreference | None
    onboarding_completed: bool
    xp: int
    level: int
    current_streak: int
    longest_streak: int


class AchievementOut(BaseModel):
    code: str
    title: str
    description: str
    earned: bool
    earned_at: datetime | None


class SyllabusImportIn(BaseModel):
    course_name: str
    raw_text: str | None = None
    learning_mode: LearningMode = LearningMode.guided


class ModuleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    title: str
    order_index: int
    estimated_hours: float | None


class LessonSummaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    title: str
    slug: str
    order_index: int
    difficulty: str | None
    estimated_minutes: int | None
    is_completed: bool
    confidence_score: float
    origin: ContentOrigin


class ModuleDetailOut(ModuleOut):
    lessons: list[LessonSummaryOut] = []


class CourseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    description: str | None
    learning_mode: LearningMode
    exam_date: date | None
    created_at: datetime


class CourseDetailOut(CourseOut):
    modules: list[ModuleDetailOut] = []


class ResourceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    filename: str
    resource_type: ResourceType
    status: ResourceStatus
    processing_stage: str | None
    error_message: str | None
    created_at: datetime


class FlashcardOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    card_type: str
    front: str
    back: str
    image_url: str | None = None


class QuizQuestionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    question_type: str
    prompt: str
    options: list[str] | None
    difficulty: str


class QuizQuestionWithAnswerOut(QuizQuestionOut):
    correct_answer: str
    explanation: str | None


class VideoOut(BaseModel):
    video_id: str
    title: str
    channel: str
    thumbnail_url: str
    duration: str
    reason: str


class ConceptConnectionOut(BaseModel):
    id: str
    title: str
    slug: str
    is_completed: bool


class PrerequisiteOut(BaseModel):
    id: str
    title: str
    slug: str
    is_completed: bool
    estimated_minutes: int | None


class LessonDetailOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    title: str
    slug: str
    overview: str | None
    content: dict | None
    origin: ContentOrigin
    source_citations: list[dict] | None
    difficulty: str | None
    estimated_minutes: int | None
    is_completed: bool
    confidence_score: float
    flashcards: list[FlashcardOut] = []
    questions: list[QuizQuestionOut] = []
    prerequisites: list[PrerequisiteOut] = []
    related_concepts: list[ConceptConnectionOut] = []
    unlocks: list[ConceptConnectionOut] = []
    recommended_videos: list[VideoOut] = []
    module_id: str
    course_id: str
    course_name: str


class QuizAttemptIn(BaseModel):
    answer: str


class QuizAttemptOut(BaseModel):
    is_correct: bool
    correct_answer: str
    explanation: str | None
    new_achievements: list[AchievementOut] = []


class LessonCompleteOut(BaseModel):
    ok: bool = True
    new_achievements: list[AchievementOut] = []


class TutorAskIn(BaseModel):
    question: str


class TutorAskOut(BaseModel):
    answer: str


class TutorMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    role: str
    content: str
    created_at: datetime


class RevisionItemOut(BaseModel):
    schedule_id: str
    lesson_id: str
    lesson_title: str
    lesson_slug: str
    module_title: str
    due_date: date
    stage: int
    stage_count: int
    confidence_score: float


class RevisionQueueOut(BaseModel):
    overdue: list[RevisionItemOut]
    due_today: list[RevisionItemOut]
    upcoming: list[RevisionItemOut]


class RevisionCompleteIn(BaseModel):
    success: bool


class RevisionCompleteOut(BaseModel):
    stage: int
    due_date: date
    mastered: bool
    new_achievements: list[AchievementOut] = []


class LessonFlashcardsOut(BaseModel):
    lesson_id: str
    lesson_title: str
    lesson_slug: str
    module_title: str
    flashcards: list[FlashcardOut]


class CourseFlashcardsOut(BaseModel):
    lessons: list[LessonFlashcardsOut]


class LessonQuizSummaryOut(BaseModel):
    lesson_id: str
    lesson_title: str
    lesson_slug: str
    module_title: str
    question_count: int
    attempted_count: int
    accuracy: float | None


class CourseQuizzesOut(BaseModel):
    lessons: list[LessonQuizSummaryOut]


class DailyActivityOut(BaseModel):
    day: date
    count: int


class AnalyticsOut(BaseModel):
    hours_studied: float
    topics_learned: int
    retention_percent: float
    quiz_accuracy: float
    revision_completion_percent: float
    weak_area_count: int
    exam_readiness: float
    daily_activity: list[DailyActivityOut]


class GamificationSummaryOut(BaseModel):
    xp: int
    level: int
    xp_into_level: int
    xp_for_next_level: int
    current_streak: int
    longest_streak: int
    achievements: list[AchievementOut]


class SearchResultOut(BaseModel):
    kind: str  # lesson | flashcard | quiz | resource
    id: str
    title: str
    subtitle: str | None
    lesson_slug: str


class SearchResponseOut(BaseModel):
    results: list[SearchResultOut]


class ExamPlanIn(BaseModel):
    exam_date: date
    target_grade: str | None = None
    daily_study_minutes: int = 60


class ExamDayItemOut(BaseModel):
    lesson_id: str
    title: str
    module_title: str
    estimated_minutes: int
    kind: str  # new | revision


class ExamDayOut(BaseModel):
    day: date
    items: list[ExamDayItemOut]
    is_buffer_day: bool
    is_mock_test_day: bool


class ExamPlanOut(BaseModel):
    exam_date: date | None
    target_grade: str | None
    daily_study_minutes: int | None
    days_until_exam: int | None
    lessons_remaining: int
    on_track: bool
    schedule: list[ExamDayOut]


class DashboardStatsOut(BaseModel):
    course_id: str
    completion_percent: float
    quiz_accuracy: float
    exam_readiness: float
    study_streak: int
    revision_due_count: int
    weak_topics: list[LessonSummaryOut]
    upcoming_lessons: list[LessonSummaryOut]
