"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TrackSnapshot } from "@/types/music";

type PlayerStatus = {
  ready: boolean;
  premiumRequired: boolean;
  deviceId?: string;
  error?: string;
  message?: string;
};

export function useSpotifyPlayer(enabled: boolean) {
  const playerRef = useRef<SpotifyPlayer | null>(null);
  const [status, setStatus] = useState<PlayerStatus>({ ready: false, premiumRequired: false });
  const [track, setTrack] = useState<TrackSnapshot | null>(null);

  const reportError = useCallback((error: unknown, fallback: string) => {
    const message = error instanceof Error ? error.message : fallback;
    setStatus((current) => ({ ...current, error: message, message: undefined }));
  }, []);

  const getToken = useCallback(async () => {
    const response = await fetch("/api/spotify/token", { cache: "no-store" });
    if (!response.ok) throw new Error("Spotify login required.");
    const data = (await response.json()) as { accessToken: string };
    return data.accessToken;
  }, []);

  const syncState = useCallback(async () => {
    const state = await playerRef.current?.getCurrentState();
    if (!state) {
      setTrack(null);
      return;
    }
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

  const runPlayerAction = useCallback(
    async (action: () => Promise<void>, fallback: string) => {
      try {
        await action();
        await syncState();
        setStatus((current) => ({ ...current, error: undefined }));
      } catch (error) {
        reportError(error, fallback);
      }
    },
    [reportError, syncState]
  );

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
        setStatus({
          ready: true,
          premiumRequired: false,
          deviceId: ready.device_id,
          message: "Browser player is ready. If play does not start, begin a song in Spotify once or select AI Music X-Ray as the device."
        });
        void transferPlayback(ready.device_id).catch((error) =>
          reportError(error, "Spotify device is ready, but playback could not be transferred to the browser.")
        );
      });
      player.addListener("not_ready", () => setStatus((current) => ({ ...current, ready: false })));
      player.addListener("account_error", () =>
        setStatus({ ready: false, premiumRequired: true, error: "Spotify Premium is required for browser playback." })
      );
      player.addListener("authentication_error", () =>
        setStatus({ ready: false, premiumRequired: false, error: "Spotify authentication expired. Please log in again." })
      );
      player.addListener("initialization_error", (payload) => {
        const error = payload as { message?: string };
        setStatus({ ready: false, premiumRequired: false, error: error.message ?? "Spotify player failed to initialize." });
      });
      player.addListener("playback_error", (payload) => {
        const error = payload as { message?: string };
        setStatus((current) => ({
          ...current,
          error: error.message ?? "Spotify playback failed. Try selecting AI Music X-Ray in Spotify's device picker."
        }));
      });
      player.addListener("player_state_changed", () => void syncState());
      void player.connect().catch((error) => reportError(error, "Spotify player failed to connect."));
      playerRef.current = player;
    };

    return () => {
      playerRef.current?.disconnect();
      playerRef.current = null;
    };
  }, [enabled, getToken, reportError, syncState]);

  useEffect(() => {
    if (!enabled) return;
    const interval = window.setInterval(() => void syncState(), 650);
    return () => window.clearInterval(interval);
  }, [enabled, syncState]);

  const togglePlay = useCallback(async () => {
    if (!playerRef.current) {
      reportError(null, "Spotify player is not ready yet.");
      return;
    }
    await runPlayerAction(() => playerRef.current!.togglePlay(), "Spotify could not play or pause.");
  }, [reportError, runPlayerAction]);

  const nextTrack = useCallback(async () => {
    if (!playerRef.current) {
      reportError(null, "Spotify player is not ready yet.");
      return;
    }
    await runPlayerAction(() => playerRef.current!.nextTrack(), "Spotify could not skip to the next track.");
  }, [reportError, runPlayerAction]);

  const previousTrack = useCallback(async () => {
    if (!playerRef.current) {
      reportError(null, "Spotify player is not ready yet.");
      return;
    }
    await runPlayerAction(() => playerRef.current!.previousTrack(), "Spotify could not go back.");
  }, [reportError, runPlayerAction]);

  const seek = useCallback(
    async (positionMs: number) => {
      if (!playerRef.current) {
        reportError(null, "Spotify player is not ready yet.");
        return;
      }
      await runPlayerAction(() => playerRef.current!.seek(positionMs), "Spotify could not seek in this track.");
    },
    [reportError, runPlayerAction]
  );

  return { status, track, togglePlay, nextTrack, previousTrack, seek, syncState };
}

async function transferPlayback(deviceId: string) {
  const response = await fetch("/api/spotify/player", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "transfer", deviceId })
  });

  if (!response.ok) {
    throw new Error("Spotify would not switch playback to AI Music X-Ray. Select it from Spotify's device picker.");
  }
}
