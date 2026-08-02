"""YouTube video recommendations for a lesson topic, via the YouTube Data API.

Requires YOUTUBE_API_KEY (see .env.example). Without it, returns an empty
list — the frontend shows an honest "connect an API key" placeholder rather
than fabricating video results.
"""

import httpx

from app.core.config import get_settings

settings = get_settings()

_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"
_VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos"


def _parse_duration(iso_duration: str) -> str:
    """Converts ISO 8601 duration (e.g. PT14M32S) to 'M:SS'."""
    import re

    match = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", iso_duration)
    if not match:
        return ""
    hours, minutes, seconds = (int(g) if g else 0 for g in match.groups())
    total_minutes = hours * 60 + minutes
    return f"{total_minutes}:{seconds:02d}"


def recommend_videos(topic: str, course_name: str, limit: int = 3) -> list[dict]:
    if not settings.youtube_api_key:
        return []

    query = f"{topic} {course_name}"
    with httpx.Client(timeout=8) as client:
        search_resp = client.get(
            _SEARCH_URL,
            params={
                "key": settings.youtube_api_key,
                "q": query,
                "part": "snippet",
                "type": "video",
                "maxResults": limit,
                "relevanceLanguage": "en",
                "safeSearch": "strict",
            },
        )
        search_resp.raise_for_status()
        items = search_resp.json().get("items", [])
        video_ids = [item["id"]["videoId"] for item in items if item.get("id", {}).get("videoId")]
        if not video_ids:
            return []

        details_resp = client.get(
            _VIDEOS_URL,
            params={"key": settings.youtube_api_key, "id": ",".join(video_ids), "part": "contentDetails"},
        )
        details_resp.raise_for_status()
        durations = {
            item["id"]: _parse_duration(item["contentDetails"]["duration"])
            for item in details_resp.json().get("items", [])
        }

    return [
        {
            "video_id": item["id"]["videoId"],
            "title": item["snippet"]["title"],
            "channel": item["snippet"]["channelTitle"],
            "thumbnail_url": item["snippet"]["thumbnails"]["medium"]["url"],
            "duration": durations.get(item["id"]["videoId"], ""),
            "reason": f"Matches \"{topic}\" closely and is highly relevant to {course_name}.",
        }
        for item in items
        if item.get("id", {}).get("videoId")
    ]
