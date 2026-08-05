"""AI provider abstraction — Gemini (free tier) preferred, OpenAI as fallback.

Everything returns None when no provider is configured so the rest of the
stack keeps its local-dev placeholder behaviour.
"""

import base64
import json
from functools import lru_cache

from app.core.config import get_settings

settings = get_settings()


def active_provider() -> str | None:
    if settings.gemini_api_key:
        return "gemini"
    if settings.openai_api_key:
        return "openai"
    return None


@lru_cache
def _gemini_client():
    """Module-level singleton — google-genai 2.x closes the underlying httpx
    transport when a short-lived Client is garbage collected mid-call."""
    from google import genai

    return genai.Client(api_key=settings.gemini_api_key)


@lru_cache
def _openai_client():
    from openai import OpenAI

    return OpenAI(api_key=settings.openai_api_key)


def chat_json(system_prompt: str, user_content: str) -> dict:
    """JSON-mode completion. The caller is responsible for the exact JSON
    shape via the system prompt."""
    if active_provider() == "gemini":
        from google.genai import types

        response = _gemini_client().models.generate_content(
            model=settings.gemini_chat_model,
            contents=user_content,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                response_mime_type="application/json",
            ),
        )
        return json.loads(response.text)
    response = _openai_client().chat.completions.create(
        model=settings.openai_chat_model,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
    )
    return json.loads(response.choices[0].message.content)


def chat(system_prompt: str, messages: list[dict]) -> str:
    """Free-form completion for multi-turn conversation (tutor)."""
    if active_provider() == "gemini":
        from google.genai import types

        contents = [
            {
                "role": "model" if m["role"] == "assistant" else "user",
                "parts": [{"text": m["content"]}],
            }
            for m in messages
        ]
        response = _gemini_client().models.generate_content(
            model=settings.gemini_chat_model,
            contents=contents,
            config=types.GenerateContentConfig(system_instruction=system_prompt),
        )
        return response.text
    client = _openai_client()
    completion = client.chat.completions.create(
        model=settings.openai_chat_model,
        messages=[{"role": "system", "content": system_prompt}, *messages],
    )
    return completion.choices[0].message.content


def embed_text(text: str) -> list[float]:
    """Single-text embedding. Gemini output is 3072-dim (matches the schema);
    OpenAI returns text-embedding-3-large's native 3072-dim."""
    if active_provider() == "gemini":
        from google.genai import types

        result = _gemini_client().models.embed_content(
            model=settings.gemini_embedding_model,
            contents=text,
            config=types.EmbedContentConfig(output_dimensionality=3072),
        )
        return result.embeddings[0].values
    response = _openai_client().embeddings.create(
        model=settings.openai_embedding_model, input=text
    )
    return response.data[0].embedding


def transcribe_audio(content: bytes, filename: str) -> str:
    """Speech-to-text for audio/video resources. Gemini accepts raw audio
    inline; OpenAI uses its Whisper transcription endpoint."""
    mime = _mime_for(filename)
    if active_provider() == "gemini":
        from google.genai import types

        response = _gemini_client().models.generate_content(
            model=settings.gemini_chat_model,
            contents=[
                types.Part.from_bytes(data=content, mime_type=mime),
                "Transcribe this audio recording word-for-word, preserving lecture content.",
            ],
        )
        return response.text or ""
    import io

    buffer = io.BytesIO(content)
    buffer.name = filename
    transcript = _openai_client().audio.transcriptions.create(
        model=settings.openai_transcription_model, file=buffer
    )
    return transcript.text


def transcribe_image(content: bytes, filename: str) -> str:
    """OCR + diagram description for image resources."""
    mime = _mime_for(filename)
    if active_provider() == "gemini":
        from google.genai import types

        response = _gemini_client().models.generate_content(
            model=settings.gemini_chat_model,
            contents=[
                types.Part.from_bytes(data=content, mime_type=mime),
                "Transcribe all text and describe any diagrams in this image, for use as lecture notes.",
            ],
        )
        return response.text or ""
    b64 = base64.b64encode(content).decode()
    response = _openai_client().chat.completions.create(
        model=settings.openai_chat_model,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "Transcribe all text and describe any diagrams in this image, for use as lecture notes.",
                    },
                    {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}},
                ],
            }
        ],
    )
    return response.choices[0].message.content or ""


def _mime_for(filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return {
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "png": "image/png",
        "heic": "image/heic",
        "webp": "image/webp",
        "mp3": "audio/mpeg",
        "wav": "audio/wav",
        "m4a": "audio/mp4",
        "aac": "audio/aac",
        "ogg": "audio/ogg",
        "flac": "audio/flac",
        "mp4": "video/mp4",
        "mov": "video/quicktime",
        "webm": "video/webm",
    }.get(ext, "application/octet-stream")


@lru_cache
def provider_label() -> str:
    return active_provider() or "none"
