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

Base.metadata.create_all(bind=engine)

app = FastAPI(title="BRoll Transcription API")

origins = [origin.strip() for origin in settings.cors_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TranscribeRequest(BaseModel):
    assetId: str
    videoUrl: str
    apiKey: str


class TranscriptionResponse(BaseModel):
    assetId: str
    text: str
    segments: list[dict]
    language: Optional[str]
    duration: Optional[float]


class StatusResponse(BaseModel):
    status: str
    model: str


@app.get("/health", response_model=StatusResponse)
async def health_check():
    return StatusResponse(status="ok", model=settings.whisper_model)


@app.post("/transcribe", response_model=TranscriptionResponse)
async def create_transcription(
    request: TranscribeRequest,
    db: Session = Depends(get_db),
):
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

    try:
        result = await transcribe_video(request.videoUrl, request.apiKey)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

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
    transcription = db.query(Transcription).filter(
        Transcription.asset_id == asset_id
    ).first()

    if not transcription:
        raise HTTPException(status_code=404, detail="Transcription not found")

    db.delete(transcription)
    db.commit()

    return {"status": "deleted", "assetId": asset_id}
