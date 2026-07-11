# Design Direction

## Theme

Build the app page by page, not as one giant redesign.

The visual language is a neo-minimal dark orbit-space system with a quiet luminous green accent. It should feel like a technical music-analysis cockpit mixed with an editorial landing page.

The mood is:
- calm
- technical
- futuristic
- musical
- premium

Not:
- generic SaaS
- cyberpunk neon
- loud gradients
- cluttered dashboard chrome

## Palette

Use one central green family for emphasis and state:

- `#F0FDF4`
- `#DCFCE7`
- `#BBF7D0`
- `#86EFAC`
- `#4ADE80`
- `#22C55E`
- `#16A34A`
- `#15803D`
- `#166534`
- `#14532D`

Support it with deep ink/slate neutrals for structure, depth, and contrast.

Recommended semantic split:
- background surfaces: slate/ink
- primary accent: mint/green
- positive state: emerald
- warning state: amber
- destructive state: red

## Shared Visual System

Use the same foundation across all pages:

- deep ink background
- faint orbital grid
- subtle star/noise texture
- blurred mint and emerald light halos
- soft radial glow behind hero sections and orbit visuals
- restrained cursor-reactive parallax
- thin orbit lines and light trails
- rounded cards with minimal borders
- soft hover lift on interactive surfaces

Motion should be smooth and restrained. If reduced motion is enabled, the UI should remain fully usable with the motion effects toned down or disabled.

## Page-By-Page Direction

### 1. Model Battle Setup

Route: `/model-battle`

This page is the mission-control entrance for a battle.

Layout goals:
- full-screen orbit-space background
- editorial hero on the left
- setup panel on the right
- keep the orbit visual present in the composition

Hero copy:
- title: `Compare how AI models hear your music.`
- subtitle: `Run the same track through multiple AI models and see where they agree, diverge, hallucinate, or reveal new musical insight.`

Setup rules:
- max 4 selected models
- selected cards glow mint/green
- unselected cards become muted when the max is reached
- helper text: `Maximum 4 models per battle`
- primary button: `Run model battle`
- secondary button: `View history`

### 2. Loading / Live Processing

Route: `/model-battle/running/:runId`

Show that the analysis is actively running.

Layout goals:
- centered orbit animation
- track name and artist
- provider status cards
- states like queued, running, validating, complete, and failed

The animation should feel like nodes orbiting around a center point and completing in sequence.

### 3. Results

Route: `/model-battle/results/:runId`

This is an AI evaluation report, not a chatbot transcript.

Order:
- top navigation
- Disagreement Orbit
- AI Verdict Summary
- Track Snapshot
- Model Comparison Table
- Raw Model Responses

Orbit requirements:
- large dark orbital canvas
- green glowing agreement center
- model nodes around the orbit
- distance from center = disagreement
- brightness = confidence
- amber/red = hallucination risk
- hover labels for model, confidence, and risk

The orbit should be the first thing the user notices.

Comparison table requirements:
- sticky model headers
- tag pills
- confidence and risk mini bars
- horizontal scroll on mobile
- readable spacing
- expandable rows if needed

### 4. History

Route: `/model-battle/history`

This is the archive of prior runs.

The page should show:
- created date
- track
- artist
- models compared
- best model
- confidence
- hallucination risk
- open result action

### 5. Live Visualizer

Route: `/visualizer`

Keep the existing visualizer functionality, but polish it to fit the same orbit-space language.

The page should feel like:
- a living audio instrument
- a 3D orbital display
- a left-side control rail
- a background that still feels cohesive with the battle/results pages

## Visual Rules

- Start with layout, spacing, and hierarchy before color.
- Use color sparingly for action, focus, selected states, and active data.
- Prefer soft radius and subtle elevation.
- Avoid loud gradients unless they serve a hero moment.
- Keep animations restrained and purposeful.
- Ensure text remains readable over all surfaces.
- Do not place critical text directly over busy imagery without a dark overlay.

## Typography / Composition

- Use oversized editorial headlines on hero sections.
- Give primary pages generous whitespace.
- Keep secondary metadata compact and legible.
- Favor calm density over dashboard clutter.

## Notes

The design should feel technical, composed, a little futuristic, and clearly music-centered, but never noisy.
