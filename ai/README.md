# Optional open-source AI analysis hooks

The production Vercel app does not run GPU or long CPU inference inside serverless functions. Use this folder for adapters that call an external analysis service.

Suggested model/service options:

- Demucs for stem separation.
- Open-Unmix for source separation.
- Essentia or librosa for rhythm, loudness, and spectral features.
- MusicNN or OpenL3 for embeddings and higher-level music understanding.

Expected API contract:

```http
POST /api/external-analysis
Content-Type: application/json

{
  "trackId": "spotify-track-id",
  "previewUrl": "https://..."
}
```

Response:

```json
{
  "stems": {
    "vocals": [0.1, 0.4],
    "drums": [0.8, 0.2],
    "bass": [0.6, 0.7],
    "other": [0.3, 0.5]
  },
  "beats": [{ "start": 0, "duration": 0.5, "confidence": 0.9 }],
  "mood": "hype",
  "sections": []
}
```

Good deployment targets for heavy analysis: Modal, Replicate, Hugging Face Spaces, RunPod, or a local Python service.
