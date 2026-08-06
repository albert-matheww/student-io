"""Pins down the provider priority order and, more importantly, that every
"is AI configured" gate across the services agrees with what chat()/chat_json()/
transcribe_audio() will actually do. A Groq-only setup was silently falling
back to placeholder content everywhere until this was caught — these tests
guard against that regressing.
"""

from app.services import ai


def _configure(monkeypatch, *, gemini=None, groq=None, openai=None):
    monkeypatch.setattr(ai.settings, "gemini_api_key", gemini)
    monkeypatch.setattr(ai.settings, "groq_api_key", groq)
    monkeypatch.setattr(ai.settings, "openai_api_key", openai)


def test_gemini_wins_when_all_three_are_configured(monkeypatch):
    _configure(monkeypatch, gemini="g", groq="q", openai="o")
    assert ai.chat_provider() == "gemini"
    assert ai.active_provider() == "gemini"


def test_groq_is_the_chat_fallback_when_gemini_is_absent(monkeypatch):
    _configure(monkeypatch, gemini=None, groq="q", openai="o")
    assert ai.chat_provider() == "groq"


def test_groq_only_setup_is_not_treated_as_unconfigured_for_chat(monkeypatch):
    """The actual bug: embeddings/vision have no Groq path, but chat and
    transcription do — a Groq-only key must still count as "configured" for
    those two, or every lesson silently degrades to placeholder content."""
    _configure(monkeypatch, gemini=None, groq="q", openai=None)
    assert ai.chat_provider() == "groq"
    # active_provider() intentionally doesn't know about Groq — it's only
    # correct for the embeddings/vision gates, never for chat/transcription.
    assert ai.active_provider() is None


def test_openai_is_the_last_resort(monkeypatch):
    _configure(monkeypatch, gemini=None, groq=None, openai="o")
    assert ai.chat_provider() == "openai"
    assert ai.active_provider() == "openai"


def test_no_provider_configured(monkeypatch):
    _configure(monkeypatch, gemini=None, groq=None, openai=None)
    assert ai.chat_provider() is None
    assert ai.active_provider() is None
