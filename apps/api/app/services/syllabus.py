"""Syllabus understanding — turns raw syllabus text into a structured course
outline (modules → lessons) using the OpenAI API.

Falls back to a single-module placeholder outline when OPENAI_API_KEY isn't
configured, so onboarding still completes end-to-end during local dev.
"""

import json

from openai import OpenAI

from app.core.config import get_settings

settings = get_settings()

_SYSTEM_PROMPT = """You are an expert curriculum designer. Given a course syllabus, \
extract a structured outline of modules and lessons (topics). Respond ONLY with JSON \
matching this shape:
{"modules": [{"title": str, "estimated_hours": number, "lessons": [{"title": str, \
"difficulty": "beginner"|"intermediate"|"advanced", "estimated_minutes": number}]}]}
Keep lesson titles concise (topic names, not full sentences). Order modules and \
lessons the way they should be studied."""


def generate_course_outline(course_name: str, raw_text: str | None) -> dict:
    if not settings.openai_api_key:
        return _placeholder_outline(course_name)

    client = OpenAI(api_key=settings.openai_api_key)
    user_content = raw_text or f"Generate a standard syllabus outline for: {course_name}"

    response = client.chat.completions.create(
        model=settings.openai_chat_model,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": f"Course: {course_name}\n\nSyllabus:\n{user_content}"},
        ],
    )
    return json.loads(response.choices[0].message.content)


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
