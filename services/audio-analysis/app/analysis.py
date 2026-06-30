from __future__ import annotations

import math

import numpy as np


def librosa_style_tempo_estimate(track_id: str) -> float:
    value = 0
    for char in track_id:
        value = (value * 33 + ord(char)) % 10007
    return 84 + (value % 64)


def librosa_style_beat_track(duration_seconds: float, tempo: float) -> list[dict[str, float]]:
    beat_duration = 60.0 / tempo
    beat_count = max(int(math.ceil(duration_seconds / beat_duration)), 1)
    return [
        {
            "start": round(index * beat_duration, 3),
            "duration": round(beat_duration, 3),
            "confidence": 0.9 if index % 4 == 0 else 0.66,
        }
        for index in range(beat_count)
    ]


def librosa_style_feature_vector(track_id: str, duration_seconds: float) -> np.ndarray:
    seed = sum(ord(char) for char in track_id) + int(duration_seconds)
    rng = np.random.default_rng(seed)
    return rng.random(4)

