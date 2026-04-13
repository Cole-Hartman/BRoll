import tempfile
import os
from typing import Optional
from urllib.parse import urljoin

import httpx
from faster_whisper import WhisperModel

from config import get_settings

settings = get_settings()

_model: Optional[WhisperModel] = None


def get_model() -> WhisperModel:
    global _model
    if _model is None:
        _model = WhisperModel(
            settings.whisper_model,
            device="cpu",
            compute_type=settings.whisper_compute_type,
        )
    return _model


def resolve_video_url(video_url: str) -> str:
    """Convert relative video paths into absolute URLs for server-side fetches."""
    if video_url.startswith(("http://", "https://")):
        return video_url

    if video_url.startswith("/"):
        if not settings.app_base_url:
            raise ValueError(
                "Relative videoUrl provided but APP_BASE_URL is not set. "
                "Set APP_BASE_URL to your public app origin (e.g. https://example.com)."
            )
        return urljoin(settings.app_base_url.rstrip("/") + "/", video_url.lstrip("/"))

    raise ValueError(
        "Invalid videoUrl. Expected absolute URL (http:// or https://) "
        "or root-relative path starting with '/'."
    )


async def download_video(video_url: str, api_key: str) -> str:
    """Download video from Immich and return path to temp file."""
    resolved_url = resolve_video_url(video_url)

    async with httpx.AsyncClient(timeout=300.0) as client:
        response = await client.get(
            resolved_url,
            headers={"x-api-key": api_key},
            follow_redirects=True,
        )
        response.raise_for_status()

        suffix = ".mp4"
        if "content-type" in response.headers:
            content_type = response.headers["content-type"]
            if "webm" in content_type:
                suffix = ".webm"
            elif "quicktime" in content_type or "mov" in content_type:
                suffix = ".mov"

        fd, path = tempfile.mkstemp(suffix=suffix)
        try:
            os.write(fd, response.content)
        finally:
            os.close(fd)

        return path


def transcribe_audio(audio_path: str) -> dict:
    """Transcribe audio file using Faster-Whisper."""
    model = get_model()

    segments_list, info = model.transcribe(
        audio_path,
        beam_size=5,
        language=None,
        vad_filter=True,
    )

    segments = []
    full_text_parts = []

    for segment in segments_list:
        segments.append({
            "start": round(segment.start, 2),
            "end": round(segment.end, 2),
            "text": segment.text.strip(),
        })
        full_text_parts.append(segment.text.strip())

    return {
        "text": " ".join(full_text_parts),
        "segments": segments,
        "language": info.language,
        "duration": round(info.duration, 2),
    }


async def transcribe_video(video_url: str, api_key: str) -> dict:
    """Download video and transcribe it."""
    video_path = await download_video(video_url, api_key)
    try:
        result = transcribe_audio(video_path)
        return result
    finally:
        if os.path.exists(video_path):
            os.unlink(video_path)
