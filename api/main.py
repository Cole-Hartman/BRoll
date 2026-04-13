# BRoll Transcription API
# This service uses Whisper to transcribe video audio from Immich assets.
# It stores transcriptions in Postgres.

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from config import get_settings
from database import get_db, engine, Base
from models import Transcription
from transcribe import transcribe_video

settings = get_settings()

# Create database tables on startup if they don't exist
Base.metadata.create_all(bind=engine)

app = FastAPI(title="BRoll Transcription API")

# CORS: Allow the frontend to call this API directly from the browser.
# Origins are configured via CORS_ORIGINS env var (comma-separated list).
origins = [origin.strip() for origin in settings.cors_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request/Response schemas

class TranscribeRequest(BaseModel):
    assetId: str    # Immich asset ID (used as key to store/lookup transcription)
    videoUrl: str   # Full URL to fetch video from Immich (includes auth)
    apiKey: str     # Immich API key (passed to fetch the video)


class TranscriptionResponse(BaseModel):
    assetId: str
    text: str              # Full transcription text
    segments: list[dict]   # Timestamped segments from Whisper
    language: Optional[str]
    duration: Optional[float]


class StatusResponse(BaseModel):
    status: str
    model: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health", response_model=StatusResponse)
async def health_check():
    """Simple health check - returns OK if the API is running."""
    return StatusResponse(status="ok", model=settings.whisper_model)

@app.post("/transcribe", response_model=TranscriptionResponse)
async def create_transcription(
    request: TranscribeRequest,
    db: Session = Depends(get_db),
):
    """
    Transcribe a video from Immich.

    1. Check if we already have a transcription for this asset (return cached)
    2. If not, download the video from Immich and run Whisper
    3. Save the result to Postgres

    Called by the frontend after recording/uploading a new video.
    """
    # Check cache first - don't re-transcribe if we already have it
    existing = db.query(Transcription).filter(
        Transcription.asset_id == request.assetId
    ).first()

    if existing:
        return TranscriptionResponse(
            assetId=existing.asset_id,
            text=existing.text,
            segments=existing.segments or [],
            language=existing.language,
            duration=existing.duration,
        )

    # No cached transcription - run Whisper on the video
    try:
        result = await transcribe_video(request.videoUrl, request.apiKey)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

    # Save to database for future lookups
    transcription = Transcription(
        asset_id=request.assetId,
        text=result["text"],
        segments=result["segments"],
        language=result["language"],
        duration=result["duration"],
    )
    db.add(transcription)
    db.commit()
    db.refresh(transcription)

    return TranscriptionResponse(
        assetId=transcription.asset_id,
        text=transcription.text,
        segments=transcription.segments or [],
        language=transcription.language,
        duration=transcription.duration,
    )


@app.get("/transcription/{asset_id}", response_model=TranscriptionResponse)
async def get_transcription(asset_id: str, db: Session = Depends(get_db)):
    """
    Get an existing transcription by Immich asset ID.
    Called by the Player view to display transcription text below the video.
    Returns 404 if we haven't transcribed this video yet.
    """
    transcription = db.query(Transcription).filter(
        Transcription.asset_id == asset_id
    ).first()

    if not transcription:
        raise HTTPException(status_code=404, detail="Transcription not found")

    return TranscriptionResponse(
        assetId=transcription.asset_id,
        text=transcription.text,
        segments=transcription.segments or [],
        language=transcription.language,
        duration=transcription.duration,
    )


@app.delete("/transcription/{asset_id}")
async def delete_transcription(asset_id: str, db: Session = Depends(get_db)):
    """
    Delete a transcription from the database.
    Useful if the transcription was bad and you want to re-run it.
    """
    transcription = db.query(Transcription).filter(
        Transcription.asset_id == asset_id
    ).first()

    if not transcription:
        raise HTTPException(status_code=404, detail="Transcription not found")

    db.delete(transcription)
    db.commit()

    return {"status": "deleted", "assetId": asset_id}
