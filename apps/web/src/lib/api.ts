const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

declare global {
  interface Window {
    Clerk?: { session?: { getToken(): Promise<string | null> } };
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

interface RequestOptions extends RequestInit {
  devUserId?: string;
}

/**
 * Thin fetch wrapper for the FastAPI backend. When Clerk is configured (see
 * apps/api/app/core/auth.py), the backend requires a real session token, so
 * this attaches one from the imperative `window.Clerk` client — there's no
 * hook context available here since `request` is a plain function shared
 * across components. Falls back to X-Dev-User-Id when Clerk isn't loaded,
 * for local development without a Clerk account.
 */
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { devUserId = "dev-user-1", headers, ...rest } = options;
  const token = await window.Clerk?.session?.getToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      ...(rest.body && !(rest.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : { "X-Dev-User-Id": devUserId }),
      ...headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new ApiError(body || res.statusText, res.status);
  }
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  postForm: <T>(path: string, form: FormData) =>
    request<T>(path, { method: "POST", body: form }),
};

// --- Types mirrored from apps/api/app/schemas.py ---

export type LearningStyle = "visual" | "reading" | "practical" | "mixed";
export type DifficultyPreference = "beginner" | "intermediate" | "exam_mode";
export type LearningMode = "guided" | "explore" | "exam" | "crash_course";
export type ResourceStatus = "uploaded" | "processing" | "processed" | "failed";
export type ContentOrigin = "uploaded" | "ai_supplement";

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  school: string | null;
  course_name: string | null;
  degree: string | null;
  semester: string | null;
  subjects: string[] | null;
  learning_style: LearningStyle | null;
  difficulty_preference: DifficultyPreference | null;
  onboarding_completed: boolean;
  xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
}

export interface LessonSummary {
  id: string;
  title: string;
  slug: string;
  order_index: number;
  difficulty: string | null;
  estimated_minutes: number | null;
  is_completed: boolean;
  confidence_score: number;
  origin: ContentOrigin;
}

export interface ModuleDetail {
  id: string;
  title: string;
  order_index: number;
  estimated_hours: number | null;
  lessons: LessonSummary[];
}

export interface CourseDetail {
  id: string;
  name: string;
  description: string | null;
  learning_mode: LearningMode;
  exam_date: string | null;
  created_at: string;
  modules: ModuleDetail[];
}

export interface DashboardStats {
  course_id: string;
  completion_percent: number;
  quiz_accuracy: number;
  exam_readiness: number;
  study_streak: number;
  revision_due_count: number;
  weak_topics: LessonSummary[];
  upcoming_lessons: LessonSummary[];
}

export type NoteBlock =
  | { type: "definition"; term: string; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bullets"; title?: string; items: string[] }
  | { type: "callout"; variant: "tip" | "warning" | "example" | "mnemonic"; title: string; text: string }
  | { type: "table"; title?: string; headers: string[]; rows: string[][] };

export interface LessonContent {
  overview: string;
  blocks: NoteBlock[];
  key_takeaways: string[];
  common_mistakes: string[];
}

export interface FlashcardData {
  id: string;
  card_type: string;
  front: string;
  back: string;
  image_url: string | null;
}

export interface QuizQuestionData {
  id: string;
  question_type: string;
  prompt: string;
  options: string[] | null;
  difficulty: string;
}

export interface Prerequisite {
  id: string;
  title: string;
  slug: string;
  is_completed: boolean;
  estimated_minutes: number | null;
}

export interface ConceptConnection {
  id: string;
  title: string;
  slug: string;
  is_completed: boolean;
}

export interface RecommendedVideo {
  video_id: string;
  title: string;
  channel: string;
  thumbnail_url: string;
  duration: string;
  reason: string;
}

export interface TutorMessage {
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface LessonDetail {
  id: string;
  title: string;
  slug: string;
  overview: string | null;
  content: LessonContent | null;
  origin: ContentOrigin;
  source_citations: { title: string; url: string }[] | null;
  difficulty: string | null;
  estimated_minutes: number | null;
  is_completed: boolean;
  confidence_score: number;
  flashcards: FlashcardData[];
  questions: QuizQuestionData[];
  prerequisites: Prerequisite[];
  related_concepts: ConceptConnection[];
  unlocks: ConceptConnection[];
  recommended_videos: RecommendedVideo[];
  module_id: string;
  course_id: string;
  course_name: string;
}

export interface QuizAttemptResult {
  is_correct: boolean;
  correct_answer: string;
  explanation: string | null;
  new_achievements: Achievement[];
}

export interface LessonCompleteResult {
  ok: boolean;
  new_achievements: Achievement[];
}

export interface ResourceOut {
  id: string;
  filename: string;
  resource_type: string;
  status: ResourceStatus;
  processing_stage: string | null;
  error_message: string | null;
  created_at: string;
}

export interface RevisionItem {
  schedule_id: string;
  lesson_id: string;
  lesson_title: string;
  lesson_slug: string;
  module_title: string;
  due_date: string;
  stage: number;
  stage_count: number;
  confidence_score: number;
}

export interface RevisionQueue {
  overdue: RevisionItem[];
  due_today: RevisionItem[];
  upcoming: RevisionItem[];
}

export interface RevisionCompleteResult {
  stage: number;
  due_date: string;
  mastered: boolean;
  new_achievements: Achievement[];
}

export interface LessonFlashcards {
  lesson_id: string;
  lesson_title: string;
  lesson_slug: string;
  module_title: string;
  flashcards: FlashcardData[];
}

export interface CourseFlashcards {
  lessons: LessonFlashcards[];
}

export interface LessonQuizSummary {
  lesson_id: string;
  lesson_title: string;
  lesson_slug: string;
  module_title: string;
  question_count: number;
  attempted_count: number;
  accuracy: number | null;
}

export interface CourseQuizzes {
  lessons: LessonQuizSummary[];
}

export interface DailyActivity {
  day: string;
  count: number;
}

export interface Achievement {
  code: string;
  title: string;
  description: string;
  earned: boolean;
  earned_at: string | null;
}

export interface GamificationSummary {
  xp: number;
  level: number;
  xp_into_level: number;
  xp_for_next_level: number;
  current_streak: number;
  longest_streak: number;
  achievements: Achievement[];
}

export interface ExamDayItem {
  lesson_id: string;
  title: string;
  module_title: string;
  estimated_minutes: number;
  kind: "new" | "revision";
}

export interface ExamDay {
  day: string;
  items: ExamDayItem[];
  is_buffer_day: boolean;
  is_mock_test_day: boolean;
}

export interface ExamPlan {
  exam_date: string | null;
  target_grade: string | null;
  daily_study_minutes: number | null;
  days_until_exam: number | null;
  lessons_remaining: number;
  on_track: boolean;
  schedule: ExamDay[];
}

export interface SearchResultOut {
  kind: "lesson" | "flashcard" | "quiz" | "resource";
  id: string;
  title: string;
  subtitle: string | null;
  lesson_slug: string;
}

export interface Analytics {
  hours_studied: number;
  topics_learned: number;
  retention_percent: number;
  quiz_accuracy: number;
  revision_completion_percent: number;
  weak_area_count: number;
  exam_readiness: number;
  daily_activity: DailyActivity[];
}
