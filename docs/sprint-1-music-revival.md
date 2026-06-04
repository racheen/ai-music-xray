# Sprint 1: Music Revival Index

## Data Model

Use `db/001_music_revival.sql` as the first Postgres migration. It creates normalized Spotify user, artist, track, track-artist, and listening event tables plus two Power BI-ready materialized views:

- `analytics_track_revival_metrics`
- `analytics_artist_revival_metrics`

Power BI can connect directly to these views once Postgres is running locally or in a managed service.

## Revival Scoring

The TypeScript implementation lives in `src/lib/analytics/revival.ts`.

Inputs:

- `playedAt`
- `trackId`
- `trackName`
- `artistId`
- `artistName`

Default scoring parameters:

- Dormant threshold: `180` days
- Comeback window: `90` days
- Current relevance window: `90` days
- Minimum era plays: `2`

Score components:

- Dormant factor: longer gaps create stronger revival signals.
- Comeback density: repeated plays after the comeback matter more than a single nostalgic play.
- Familiarity: revival requires some meaningful listening before the gap.
- Current relevance: recent plays show whether the revived entity is still active.

## API

`GET /api/analytics/revival`

Reads the authenticated user's recent Spotify plays and returns track and artist revival metrics. This is useful for endpoint wiring, but Spotify recently played data is too short for real multi-year revival analysis.

`POST /api/analytics/revival`

Analyzes supplied listening history.

```json
{
  "entityType": "artist",
  "dormantThresholdDays": 180,
  "comebackWindowDays": 90,
  "events": [
    {
      "playedAt": "2021-02-14T03:10:00.000Z",
      "trackId": "spotify-track-id",
      "trackName": "Song name",
      "artistId": "spotify-artist-id",
      "artistName": "Artist name"
    }
  ]
}
```

## Next Backend Step

Add a Dockerized backend or worker that imports Spotify Extended Streaming History JSON into `spotify_listening_events`. That will unlock the multi-year revival dashboard and make Power BI meaningful.

## Import Spotify History

Put Spotify Extended Streaming History JSON files in:

```text
data/spotify-history
```

Start Postgres:

```bash
docker compose up -d postgres
```

Run the importer:

```bash
npm run db:import:spotify
```

Or import from another folder:

```bash
npm run db:import:spotify -- /path/to/spotify-history
```

The importer supports both newer `endsong_*.json` files with Spotify track URIs and older `StreamingHistory*.json` files that only include track and artist names. When Spotify IDs are missing, it creates stable local IDs so the revival views still work.

## Get History Data

For the real multi-year dashboard, request your Spotify Extended Streaming History from Spotify's privacy/data export flow. This is not something the API can fully scrape retroactively.

While waiting for that export, you can collect the recent-play API window:

```http
GET /api/analytics/spotify-history
```

Open that route in the app after logging in with Spotify. It returns normalized JSON shaped like:

```json
{
  "events": [
    {
      "playedAt": "2026-06-03T22:10:00.000Z",
      "trackId": "spotify-track-id",
      "trackName": "Song name",
      "artistId": "spotify-artist-id",
      "artistName": "Artist name"
    }
  ]
}
```

That API data is good for testing and ongoing sync, but it only covers recent listening.
