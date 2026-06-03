"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TrackSnapshot } from "@/types/music";

type PlayerStatus = {
  ready: boolean;
  premiumRequired: boolean;
  deviceId?: string;
  error?: string;
};

export function useSpotifyPlayer(enabled: boolean) {
  const playerRef = useRef<SpotifyPlayer | null>(null);
  const [status, setStatus] = useState<PlayerStatus>({ ready: false, premiumRequired: false });
  const [track, setTrack] = useState<TrackSnapshot | null>(null);

  const getToken = useCallback(async () => {
    const response = await fetch("/api/spotify/token", { cache: "no-store" });
    if (!response.ok) throw new Error("Spotify login required.");
    const data = (await response.json()) as { accessToken: string };
    return data.accessToken;
  }, []);

  const syncState = useCallback(async () => {
    const state = await playerRef.current?.getCurrentState();
    if (!state) return;
    const current = state.track_window.current_track;
    setTrack({
      id: current.id,
      name: current.name,
      artist: current.artists.map((artist) => artist.name).join(", "),
      albumArt: current.album.images[0]?.url,
      durationMs: current.duration_ms ?? state.duration,
      progressMs: state.position,
      isPlaying: !state.paused,
      previewUrl: current.preview_url,
      source: "spotify"
    });
  }, []);

  useEffect(() => {
    if (!enabled || playerRef.current) return;

    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {
      if (!window.Spotify) return;
      const player = new window.Spotify.Player({
        name: "AI Music X-Ray",
        volume: 0.8,
        getOAuthToken: async (callback) => callback(await getToken())
      });

      player.addListener("ready", (payload) => {
        const ready = payload as { device_id: string };
        setStatus({ ready: true, premiumRequired: false, deviceId: ready.device_id });
      });
      player.addListener("not_ready", () => setStatus((current) => ({ ...current, ready: false })));
      player.addListener("account_error", () =>
        setStatus({ ready: false, premiumRequired: true, error: "Spotify Premium is required for browser playback." })
      );
      player.addListener("authentication_error", () =>
        setStatus({ ready: false, premiumRequired: false, error: "Spotify authentication expired. Please log in again." })
      );
      player.addListener("player_state_changed", () => void syncState());
      void player.connect();
      playerRef.current = player;
    };

    return () => {
      playerRef.current?.disconnect();
      playerRef.current = null;
    };
  }, [enabled, getToken, syncState]);

  useEffect(() => {
    if (!enabled) return;
    const interval = window.setInterval(() => void syncState(), 650);
    return () => window.clearInterval(interval);
  }, [enabled, syncState]);

  const togglePlay = useCallback(async () => {
    await playerRef.current?.togglePlay();
    await syncState();
  }, [syncState]);

  return { status, track, togglePlay, syncState };
}
