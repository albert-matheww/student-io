"""Generates the actual teaching content for a lesson: structured notes,
flashcards, and quiz questions — the "AI Notes" and "AI Teacher" pieces of
the product. Uses the configured AI provider (Gemini by default); otherwise
returns clearly-labeled placeholder content so the lesson page is fully
explorable in local dev.
"""

from app.core.config import get_settings
from app.services import ai

settings = get_settings()

_NOTES_SYSTEM_PROMPT = """You are an expert teacher writing study notes for a student. \
Never write long paragraphs. Respond ONLY with JSON:
{
  "overview": str (2-3 sentences),
  "blocks": [
    {"type": "definition", "term": str, "text": str} |
    {"type": "paragraph", "text": str (max 3 sentences)} |
    {"type": "bullets", "title": str, "items": [str]} |
    {"type": "callout", "variant": "tip"|"warning"|"example"|"mnemonic", "title": str, "text": str} |
    {"type": "table", "title": str, "headers": [str], "rows": [[str]]}
  ] (6-10 blocks, mix of types, use at least one definition, one example callout, and one mnemonic if applicable),
  "key_takeaways": [str] (3-5 items),
  "common_mistakes": [str] (2-3 items)
}"""

_FLASHCARD_SYSTEM_PROMPT = """Generate 6 flashcards for this lesson as JSON: \
{"flashcards": [{"card_type": "basic"|"definition"|"formula"|"fill_blank", "front": str, "back": str}]}"""

_QUIZ_SYSTEM_PROMPT = """Generate 5 quiz questions for this lesson, mixing types, as JSON: \
{"questions": [{"question_type": "mcq"|"true_false"|"fill_blank", "prompt": str, \
"options": [str] | null, "correct_answer": str, "explanation": str, "difficulty": "easy"|"medium"|"hard"}]}"""


def generate_lesson_notes(lesson_title: str, course_name: str) -> dict:
    if not ai.active_provider():
        return _placeholder_notes(lesson_title)
    try:
        return ai.chat_json(
            _NOTES_SYSTEM_PROMPT,
            f"Course: {course_name}\nLesson: {lesson_title}",
        )
    except Exception:  # noqa: BLE001 — provider hiccups degrade to the placeholder
        return _placeholder_notes(lesson_title)


def generate_flashcards(lesson_title: str, course_name: str) -> list[dict]:
    if not ai.active_provider():
        return _placeholder_flashcards(lesson_title)
    try:
        result = ai.chat_json(
            _FLASHCARD_SYSTEM_PROMPT,
            f"Course: {course_name}\nLesson: {lesson_title}",
        )
        return result.get("flashcards") or _placeholder_flashcards(lesson_title)
    except Exception:  # noqa: BLE001
        return _placeholder_flashcards(lesson_title)


def generate_quiz_questions(lesson_title: str, course_name: str) -> list[dict]:
    if not ai.active_provider():
        return _placeholder_quiz(lesson_title)
    try:
        result = ai.chat_json(
            _QUIZ_SYSTEM_PROMPT,
            f"Course: {course_name}\nLesson: {lesson_title}",
        )
        return result.get("questions") or _placeholder_quiz(lesson_title)
    except Exception:  # noqa: BLE001
        return _placeholder_quiz(lesson_title)


def answer_tutor_question(
    question: str,
    lesson_title: str,
    course_name: str,
    notes_context: str,
    history: list[dict] | None = None,
    student_context: str | None = None,
) -> str:
    """`history` is prior turns in this lesson's conversation (cross-session
    memory); `student_context` summarizes what the AI already knows about
    this student — weak topics, mastered topics, learning style — so answers
    adapt instead of repeating a generic explanation every time."""
    if not ai.active_provider():
        return (
            f"I'd explain \"{lesson_title}\" simply, with an analogy and a worked example here — "
            "connect an AI provider key in apps/api/.env to enable live AI tutoring."
        )

    system_prompt = (
        f"You are a patient, encouraging tutor helping a student with '{lesson_title}' "
        f"in their course '{course_name}'. Use simple language, an analogy, and a short "
        f"example. Remember earlier turns in this conversation — don't re-explain something "
        f"you already covered unless asked. Lesson context:\n{notes_context}"
    )
    if student_context:
        system_prompt += f"\n\nWhat you know about this student:\n{student_context}"

    messages = [{"role": "system", "content": system_prompt}]
    for turn in history or []:
        messages.append({"role": turn["role"], "content": turn["content"]})
    messages.append({"role": "user", "content": question})

    conversation = messages[1:]
    return ai.chat(messages[0]["content"], conversation)


def _placeholder_notes(lesson_title: str) -> dict:
    return {
        "overview": f"This lesson covers the core ideas behind {lesson_title}, building the foundation "
        "you'll need for everything that follows in this module.",
        "blocks": [
            {"type": "definition", "term": lesson_title, "text": "Connect an AI provider key to generate real, sourced notes for this topic."},
            {
                "type": "callout",
                "variant": "tip",
                "title": "Exam tip",
                "text": "Once AI generation is enabled, this card will surface the highest-yield facts examiners test on this topic.",
            },
            {
                "type": "bullets",
                "title": "What you'll learn",
                "items": ["Core definitions", "Worked examples", "Common pitfalls", "How it connects to prior lessons"],
            },
        ],
        "key_takeaways": [f"{lesson_title} is a foundational concept in this module."],
        "common_mistakes": ["Skipping the prerequisites before attempting this topic."],
    }


def _placeholder_flashcards(lesson_title: str) -> list[dict]:
    return [
        {"card_type": "basic", "front": f"What is {lesson_title}?", "back": "Connect an AI provider key to generate a real answer."},
        {"card_type": "basic", "front": f"Why does {lesson_title} matter?", "back": "Connect an AI provider key to generate a real answer."},
    ]


def _placeholder_quiz(lesson_title: str) -> list[dict]:
    return [
        {
            "question_type": "mcq",
            "prompt": f"Which best describes {lesson_title}? (placeholder — connect an AI provider key for real questions)",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correct_answer": "Option A",
            "explanation": "Placeholder explanation.",
            "difficulty": "medium",
        }
    ]
