# AI Music X-Ray

A full-stack Next.js App Router music visualizer for Vercel. Users can connect Spotify, play a track through the Spotify Web Playback SDK, and see real-time Three.js visuals driven by beat data, progress, tempo, sections, and simulated stems.

The app runs end-to-end immediately in demo mode. Spotify analysis endpoints are attempted when available, then the app gracefully falls back to generated beat and stem data.

## Tech stack

- Next.js App Router and TypeScript
- Tailwind CSS
- React Three Fiber, Three.js, and drei postprocessing
- Spotify Web API and Spotify Web Playback SDK
- Secure server-side Spotify OAuth routes
- Optional external AI analysis interface for open-source models

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Spotify Developer app setup

1. Go to the Spotify Developer Dashboard and create an app.
2. Add this redirect URI for local development:

```text
http://localhost:3000/api/spotify/callback
```

3. Copy the app client ID and client secret into `.env.local`.
4. Use these variables:

```bash
SPOTIFY_CLIENT_ID="..."
SPOTIFY_CLIENT_SECRET="..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"
SPOTIFY_REDIRECT_URI="http://localhost:3000/api/spotify/callback"
```

The Spotify client secret is only read inside server route handlers. It is never exposed to client components.

## Vercel deployment

1. Create a Vercel project from this repository.
2. Add the production URL to Spotify as a redirect URI:

```text
https://your-project.vercel.app/api/spotify/callback
```

3. Add the same environment variables in Vercel, with production URLs:

```bash
NEXT_PUBLIC_APP_URL="https://your-project.vercel.app"
SPOTIFY_REDIRECT_URI="https://your-project.vercel.app/api/spotify/callback"
```

No GPU inference or long-running analysis is required in Vercel functions.

## Playback limitations

- Spotify Web Playback SDK browser playback requires Spotify Premium.
- Users may need to select `AI Music X-Ray` from Spotify's device picker.
- Some Spotify audio analysis or audio feature endpoints may be unavailable for newer developer accounts. The app detects that and uses generated analysis instead.

## Demo mode

`/app` opens in demo mode by default, so the visualizer works without Spotify credentials. Demo mode drives the same visual engine with generated tempo, beats, sections, and simulated stems.

Keyboard shortcuts:

- `Space`: play or pause
- `m`: cycle mood
- `l`: toggle layer preset

## Optional open-source AI roadmap

The app includes a model-ready interface in `src/lib/ai/external-analysis.ts` and documentation in `ai/README.md`.

Suggested integrations:

- Demucs for stem separation
- Open-Unmix for source separation
- Essentia or librosa for audio features
- MusicNN or OpenL3 for embeddings and higher-level music understanding

Heavy analysis should run outside Vercel on Modal, Replicate, Hugging Face Spaces, RunPod, or a local Python service.

## Sprint 1: Music Revival Index

The first analytics sprint adds a revival scoring module and API endpoint:

```http
POST /api/analytics/revival
```

Use this endpoint with imported listening history to detect tracks or artists that disappeared from rotation and later returned. The current `GET /api/analytics/revival` route can read Spotify recently played data for wiring checks, but real multi-year revival analysis needs stored history from Spotify Extended Streaming History or a future ingestion worker.

You can also export the authenticated user's recent-play API window as normalized JSON:

```http
GET /api/analytics/spotify-history
```

Database starter files:

- `db/001_music_revival.sql`: Postgres tables and Power BI-ready materialized views.
- `docs/sprint-1-music-revival.md`: scoring notes, endpoint contract, and next backend step.

Example contract:

```http
POST /api/external-analysis
Content-Type: application/json

{
  "trackId": "spotify-track-id",
  "previewUrl": "https://..."
}
```

Returns:

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

## Production notes

- Access and refresh tokens are stored in HTTP-only cookies.
- Access tokens are returned to the client only for Spotify's Web Playback SDK.
- Refresh logic lives in server routes.
- `.env.example` documents all required configuration.

## Checks

```bash
npm run lint
npm run build
```
