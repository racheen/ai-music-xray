import type { TrackSnapshot } from "@/types/music";
import type { SpotifyPlayback, SpotifyTrack } from "./types";

export function trackToSnapshot(track: SpotifyTrack, progressMs = 0, isPlaying = false): TrackSnapshot {
  return {
    id: track.id,
    name: track.name,
    artist: track.artists.map((artist) => artist.name).join(", "),
    albumArt: track.album.images[0]?.url,
    durationMs: track.duration_ms,
    progressMs,
    isPlaying,
    previewUrl: track.preview_url,
    source: "spotify"
  };
}

export function playbackToSnapshot(playback: SpotifyPlayback): TrackSnapshot | null {
  if (!playback.item) return null;
  return trackToSnapshot(playback.item, playback.progress_ms, playback.is_playing);
}
