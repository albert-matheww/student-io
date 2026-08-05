"""Syllabus understanding — turns raw syllabus text into a structured course
outline (modules → lessons) using the AI provider.

Falls back to a single-module placeholder outline when no provider is
configured (or fails), so onboarding still completes end-to-end during local
dev.
"""

from app.core.config import get_settings
from app.services import ai

settings = get_settings()

_SYSTEM_PROMPT = """You are an expert curriculum designer. Given a course syllabus, \
extract a structured outline of modules and lessons (topics). Respond ONLY with JSON \
matching this shape:
{"modules": [{"title": str, "estimated_hours": number, "lessons": [{"title": str, \
"difficulty": "beginner"|"intermediate"|"advanced", "estimated_minutes": number}]}]}
Keep lesson titles concise (topic names, not full sentences). Order modules and \
lessons the way they should be studied."""


def generate_course_outline(course_name: str, raw_text: str | None) -> dict:
    if not ai.active_provider():
        return _placeholder_outline(course_name)

    user_content = raw_text or f"Generate a standard syllabus outline for: {course_name}"
    try:
        outline = ai.chat_json(
            _SYSTEM_PROMPT,
            f"Course: {course_name}\n\nSyllabus:\n{user_content}",
        )
        return outline if outline.get("modules") else _placeholder_outline(course_name)
    except Exception:  # noqa: BLE001 — provider hiccups degrade to the placeholder, not a 500
        return _placeholder_outline(course_name)


def _placeholder_outline(course_name: str) -> dict:
    return {
        "modules": [
            {
                "title": f"Module 1 — Foundations of {course_name}",
                "estimated_hours": 4,
                "lessons": [
                    {"title": "Introduction & Scope", "difficulty": "beginner", "estimated_minutes": 20},
                    {"title": "Core Terminology", "difficulty": "beginner", "estimated_minutes": 25},
                ],
            }
        ]
    }
