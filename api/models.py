from sqlalchemy import Column, Integer, String, Text, Float, DateTime, JSON
from sqlalchemy.sql import func

from database import Base


class Transcription(Base):
    __tablename__ = "transcriptions"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(String(255), unique=True, nullable=False, index=True)
    text = Column(Text, nullable=False)
    segments = Column(JSON)
    language = Column(String(10))
    duration = Column(Float)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
