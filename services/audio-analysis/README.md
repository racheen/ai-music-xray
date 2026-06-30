# Audio Analysis Service

This containerized FastAPI service is the production-style analysis layer for AI Music X-Ray.

## Endpoints

- `GET /health`
- `POST /analyze`

## Request

```json
{
  "trackId": "spotify-track-id",
  "previewUrl": "https://...",
  "durationMs": 210000
}
```

## Response

The service returns:

- tempo
- beats
- sections
- mood
- stems

The implementation here is intentionally placeholder-friendly so it can be swapped with `librosa`, `essentia`, stem separation, or a custom inference pipeline later.

