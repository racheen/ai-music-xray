# Architecture

## System Overview

AI Music X-Ray is a Next.js App Router application with three main concerns:

1. presentation and interaction in the browser
2. Spotify-backed playback and auth on the server
3. model comparison, music analysis, and history/analytics processing

## Layers

### UI Layer

- landing page
- login/auth entry points
- visualizer shell
- track and history views
- shared UI primitives

### Server Layer

- Spotify login, callback, refresh, and playback routes
- analytics API routes
- history export endpoints
- token handling in HTTP-only cookies

### Data Layer

- Postgres starter schema for revival analytics
- normalized listening history events
- materialized views for analytics consumption

### Analysis Layer

- generated beat and stem data for demo mode
- optional model-ready external analysis hooks
- AI model battle workflow with normalized input and Zod-validated output
- deterministic evaluation and comparison summaries
- future worker/service integration for heavier processing

## Key Boundaries

- Client components should not own secrets.
- Spotify integration should stay server-authenticated.
- Demo mode should be able to exercise the visual engine without external dependencies.
- Heavy analysis should remain outside Vercel runtime constraints.

## Design Boundary

The visual system should be centralized through shared theme tokens and reusable surface styles rather than per-page color overrides.

## Evolution Path

- keep the current visualizer and analytics contracts stable
- improve the shared design tokens and surface styling
- expand analytics ingestion when real historical data is available
- move expensive analysis into an external worker/service only when needed
- keep provider adapters environment-gated and server-side only
