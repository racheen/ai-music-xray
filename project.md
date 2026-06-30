# AI Music X-Ray Project Brief

## Summary

AI Music X-Ray is a full-stack Next.js App Router app that turns Spotify playback and listening history into a real-time music visualizer and analytics surface.

The product mixes three layers:

- a demo-friendly visualizer that works without credentials
- a Spotify-connected playback experience with server-side auth
- an analysis pipeline for beat, section, stem, and revival-style music insights

## Product Goals

- Make music feel visible, not just audible.
- Keep the app useful in demo mode even before Spotify setup.
- Preserve secure OAuth and server-side token handling.
- Leave room for heavier open-source analysis services later.
- Present the product with a restrained neo-minimal aesthetic and a soft green palette.

## Current State

The repository already includes:

- a public landing page and login flow
- Spotify auth, callback, and playback integration routes
- demo-mode visualizer behavior
- history export and revival analytics routes
- a Postgres starter migration for music revival analytics
- docs for the first sprint

## What This Repo Is Not

- not a generic marketing site
- not a throwaway mock
- not a long-running GPU analysis service
- not a separate frontend-only prototype

## Implementation Principles

- Keep server-side secrets out of client bundles.
- Prefer small, composable modules over broad rewrites.
- Keep demo mode working when external services are unavailable.
- Separate UI, playback, analytics, and data concerns.
- Let the design feel calm, technical, and intentional.

## Visual Direction

- neo-minimal
- dark base with soft green/mint accenting
- generous whitespace and clear hierarchy
- subtle surfaces instead of heavy borders
- restrained motion and glow
- readable typography first, decoration second

## Near-Term Outcomes

- tighten the green-hued visual language across the app shell and landing surfaces
- keep the project docs aligned with the actual repository shape
- preserve the production-ready Spotify/server boundary while the visual language evolves

