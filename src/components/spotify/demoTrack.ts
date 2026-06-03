import type { TrackSnapshot } from "@/types/music";

export const demoTrack: TrackSnapshot = {
  id: "demo-neon-orbit",
  name: "Neon Orbit",
  artist: "Synthetic Session",
  albumArt:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Cdefs%3E%3CradialGradient id='g' cx='50%25' cy='42%25'%3E%3Cstop offset='0%25' stop-color='%2367e8f9'/%3E%3Cstop offset='45%25' stop-color='%23a78bfa'/%3E%3Cstop offset='100%25' stop-color='%23020617'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect width='512' height='512' fill='url(%23g)'/%3E%3Ccircle cx='256' cy='256' r='130' fill='none' stroke='%23fff' stroke-opacity='.65' stroke-width='14'/%3E%3Cpath d='M104 286c93-98 210-111 304-39' fill='none' stroke='%23f0abfc' stroke-width='18' stroke-linecap='round'/%3E%3C/svg%3E",
  durationMs: 226000,
  progressMs: 0,
  isPlaying: true,
  tempo: 124,
  previewUrl: null,
  source: "demo"
};
