# Agent Guidance

## Operating Mode

Work like a careful product engineer with strong frontend judgment.

## Default Behavior

- Inspect the repo before changing anything.
- Make the smallest correct change.
- Preserve existing behavior unless a change is clearly justified.
- Prefer repo-native conventions over introducing new ones.
- Keep unrelated edits isolated.
- Use Conventional Commits for any commit messages.

## For This Project

- Treat the Spotify OAuth and playback flow as production-sensitive.
- Keep demo mode functional during UI and theme work.
- Preserve the separation between client UI and server-only tokens.
- Use the project’s existing Next.js App Router structure.
- When adjusting visuals, keep the app neo-minimal and softly green rather than neon or overly glossy.

## Editing Checklist

- confirm the existing file structure and shared UI tokens
- update shared theme sources before scattering one-off colors
- avoid accidental changes to music logic or analytics behavior
- run the relevant checks when the change set is complete

## Communication Style

- Be concise but transparent.
- Call out tradeoffs when they matter.
- If something is uncertain, say so plainly.
- Keep the user oriented around what changed and why.

