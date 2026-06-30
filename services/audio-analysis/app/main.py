from __future__ import annotations

import math
from typing import Literal

import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(title="AI Music X-Ray Audio Analysis", version="0.1.0")


class AnalyzeRequest(BaseModel):
    trackId: str = Field(min_length=1)
    previewUrl: str | None = None
    durationMs: int | None = None


class Beat(BaseModel):
    start: float
    duration: float
    confidence: float


class Section(BaseModel):
    start: float
    duration: float
    loudness: float
    tempo: float


class Stems(BaseModel):
    vocals: float
    drums: float
    bass: float
    other: float


class AnalyzeResponse(BaseModel):
    trackId: str
    tempo: float
    beats: list[Beat]
    sections: list[Section]
    mood: Literal["chill", "hype", "dark", "dreamy"]
    stems: Stems


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(payload: AnalyzeRequest) -> AnalyzeResponse:
    duration_seconds = max((payload.durationMs or 210000) / 1000, 30)
    tempo = _tempo_from_track(payload.trackId)
    beat_duration = 60.0 / tempo
    beat_count = max(int(math.ceil(duration_seconds / beat_duration)), 1)

    beats = [
        Beat(
            start=round(index * beat_duration, 3),
            duration=round(beat_duration, 3),
            confidence=0.92 if index % 4 == 0 else 0.66,
        )
        for index in range(beat_count)
    ]
    sections = [
        Section(
            start=float(index * 32),
            duration=float(min(32, duration_seconds - index * 32)),
            loudness=float(-18 + ((index * 5) % 11)),
            tempo=float(tempo + ((index % 3) - 1) * 1.5),
        )
        for index in range(int(math.ceil(duration_seconds / 32)))
    ]

    spectrum = np.array([tempo % 100, len(beats) % 100, duration_seconds % 100, 42.0], dtype=float)
    stems = _stems_from_features(spectrum)
    mood = _mood_from_features(tempo, stems.vocals, stems.drums)

    return AnalyzeResponse(
        trackId=payload.trackId,
        tempo=round(tempo, 2),
        beats=beats,
        sections=sections,
        mood=mood,
        stems=stems,
    )


def _tempo_from_track(track_id: str) -> float:
    value = 0
    for char in track_id:
        value = (value * 31 + ord(char)) % 10000
    return 84 + (value % 66)


def _stems_from_features(features: np.ndarray) -> Stems:
    normalized = np.abs(np.sin(features / 17.0))
    total = float(normalized.sum()) or 1.0
    scaled = normalized / total
    return Stems(
        vocals=round(float(scaled[0]), 2),
        drums=round(float(scaled[1]), 2),
        bass=round(float(scaled[2]), 2),
        other=round(float(scaled[3]), 2),
    )


def _mood_from_features(tempo: float, vocals: float, drums: float) -> Literal["chill", "hype", "dark", "dreamy"]:
    if tempo >= 140 and drums > vocals:
        return "hype"
    if tempo < 96 and vocals > 0.28:
        return "dreamy"
    if drums < 0.2:
        return "dark"
    return "chill"

