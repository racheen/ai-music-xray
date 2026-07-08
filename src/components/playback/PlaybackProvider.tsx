"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { createFallbackAnalysis } from "@/lib/analysis/fallback";
import type { LayerId, Mood, TrackAnalysis, TrackSnapshot } from "@/types/music";
import { demoTrack } from "@/components/spotify/demoTrack";
import { TrackPanel } from "@/components/spotify/TrackPanel";
import { useSpotifyPlayer } from "@/components/spotify/useSpotifyPlayer";

const initialLayers: Record<LayerId, boolean> = {
  bass: true,
  drums: true,
  vocals: true,
  other: true
};

type PlaybackContextValue = {
  isDemo: boolean;
  spotifyAuthenticated: boolean;
  authChecked: boolean;
  controlsVisible: boolean;
  mood: Mood;
  layers: Record<LayerId, boolean>;
  analysis: TrackAnalysis;
  activeTrack: TrackSnapshot | null;
  progress: number;
  playerReady?: boolean;
  premiumRequired?: boolean;
  playerError?: string;
  playerMessage?: string;
  setMood: (mood: Mood) => void;
  toggleLayer: (layer: LayerId) => void;
  togglePlay: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
  seekTrack: (positionMs: number) => void;
  useDemoMode: () => void;
  useSpotifyMode: () => void;
  showControls: () => void;
  hideControls: () => void;
};

const PlaybackContext = createContext<PlaybackContextValue | null>(null);

export function PlaybackProvider({ children }: { children: ReactNode }) {
  const [isDemo, setIsDemo] = useState(true);
  const [spotifyAuthenticated, setSpotifyAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [demoPlaying, setDemoPlaying] = useState(true);
  const [demoProgress, setDemoProgress] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [mood, setMood] = useState<Mood>("hype");
  const [layers, setLayers] = useState(initialLayers);
  const [analysis, setAnalysis] = useState<TrackAnalysis>(() =>
    createFallbackAnalysis({ trackId: demoTrack.id, durationMs: demoTrack.durationMs, tempo: demoTrack.tempo })
  );
  const {
    status,
    track: spotifyTrack,
    togglePlay: toggleSpotifyPlay,
    nextTrack: nextSpotifyTrack,
    previousTrack: previousSpotifyTrack,
    seek: seekSpotifyTrack
  } = useSpotifyPlayer(!isDemo);

  useEffect(() => {
    let cancelled = false;

    async function checkSpotifySession() {
      try {
        const response = await fetch("/api/spotify/session", { cache: "no-store" });
        const session = (await response.json()) as { authenticated: boolean };
        if (cancelled) return;
        setSpotifyAuthenticated(session.authenticated);
        if (session.authenticated) setIsDemo(false);
      } catch {
        if (!cancelled) setSpotifyAuthenticated(false);
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    }

    void checkSpotifySession();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isDemo || !demoPlaying) return;
    const started = performance.now() - demoProgress;
    const tick = window.setInterval(() => {
      setDemoProgress((performance.now() - started) % demoTrack.durationMs);
    }, 100);
    return () => window.clearInterval(tick);
  }, [demoPlaying, demoProgress, isDemo]);

  const activeTrack: TrackSnapshot | null = useMemo(() => {
    if (isDemo) return { ...demoTrack, progressMs: demoProgress, isPlaying: demoPlaying };
    return spotifyTrack;
  }, [demoPlaying, demoProgress, isDemo, spotifyTrack]);

  const analysisTrackId = activeTrack?.id;
  const analysisDurationMs = activeTrack?.durationMs;
  const analysisSource = activeTrack?.source;
  const analysisTempo = activeTrack?.tempo;
  const analysisPreviewUrl = activeTrack?.previewUrl ?? null;

  useEffect(() => {
    if (!analysisTrackId || !analysisDurationMs || !analysisSource) return;
    const currentTrackId = analysisTrackId;
    const currentDurationMs = analysisDurationMs;
    const currentSource = analysisSource;
    const currentTempo = analysisTempo;
    const currentPreviewUrl = analysisPreviewUrl;
    let cancelled = false;
    async function loadAnalysis() {
      if (currentSource === "demo") {
        setAnalysis(createFallbackAnalysis({ trackId: currentTrackId, durationMs: currentDurationMs, tempo: currentTempo }));
        return;
      }
      const response = await fetch("/api/analyze-track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackId: currentTrackId,
          previewUrl: currentPreviewUrl,
          durationMs: currentDurationMs
        }),
        cache: "no-store"
      });
      if (!response.ok) {
        setAnalysis(createFallbackAnalysis({ trackId: currentTrackId, durationMs: currentDurationMs }));
        return;
      }
      const data = (await response.json()) as {
        beats: TrackAnalysis["beats"];
        sections?: TrackAnalysis["sections"];
        mood?: Mood;
        stems?: TrackAnalysis["stems"];
        tempo?: number;
      };
      const nextAnalysis: TrackAnalysis = {
        tempo: data.tempo,
        beats: data.beats,
        sections: data.sections,
        mood: data.mood,
        stems: data.stems
      };
      if (!cancelled) setAnalysis(nextAnalysis);
    }
    void loadAnalysis();
    return () => {
      cancelled = true;
    };
  }, [analysisDurationMs, analysisPreviewUrl, analysisSource, analysisTempo, analysisTrackId]);

  const togglePlay = useCallback(() => {
    if (isDemo) {
      setDemoPlaying((value) => !value);
      return;
    }
    void toggleSpotifyPlay();
  }, [isDemo, toggleSpotifyPlay]);

  const nextTrack = useCallback(() => {
    if (isDemo) {
      setDemoProgress(0);
      setDemoPlaying(true);
      return;
    }
    void nextSpotifyTrack();
  }, [isDemo, nextSpotifyTrack]);

  const previousTrack = useCallback(() => {
    if (isDemo) {
      setDemoProgress(0);
      return;
    }
    void previousSpotifyTrack();
  }, [isDemo, previousSpotifyTrack]);

  const seekTrack = useCallback(
    (positionMs: number) => {
      const safePosition = Math.max(0, Math.min(positionMs, activeTrack?.durationMs ?? demoTrack.durationMs));
      if (isDemo) {
        setDemoProgress(safePosition);
        return;
      }
      void seekSpotifyTrack(safePosition);
    },
    [activeTrack?.durationMs, isDemo, seekSpotifyTrack]
  );

  const toggleLayer = useCallback((layer: LayerId) => {
    setLayers((current) => ({ ...current, [layer]: !current[layer] }));
  }, []);

  const useDemoMode = useCallback(() => setIsDemo(true), []);
  const useSpotifyMode = useCallback(() => setIsDemo(false), []);
  const showControls = useCallback(() => setControlsVisible(true), []);
  const hideControls = useCallback(() => setControlsVisible(false), []);
  const progress = activeTrack?.progressMs ?? 0;

  const value = useMemo<PlaybackContextValue>(
    () => ({
      isDemo,
      spotifyAuthenticated,
      authChecked,
      controlsVisible,
      mood,
      layers,
      analysis,
      activeTrack,
      progress,
      playerReady: status.ready,
      premiumRequired: status.premiumRequired,
      playerError: status.error,
      playerMessage: status.message,
      setMood,
      toggleLayer,
      togglePlay,
      nextTrack,
      previousTrack,
      seekTrack,
      useDemoMode,
      useSpotifyMode,
      showControls,
      hideControls
    }),
    [
      activeTrack,
      analysis,
      authChecked,
      controlsVisible,
      progress,
      isDemo,
      layers,
      mood,
      nextTrack,
      previousTrack,
      seekTrack,
      showControls,
      hideControls,
      spotifyAuthenticated,
      status.error,
      status.message,
      status.premiumRequired,
      status.ready,
      toggleLayer,
      togglePlay,
      useDemoMode,
      useSpotifyMode
    ]
  );

  return (
    <PlaybackContext.Provider value={value}>
      {children}
      <PersistentPlaybackDock />
    </PlaybackContext.Provider>
  );
}

export function usePlayback() {
  const context = useContext(PlaybackContext);
  if (!context) throw new Error("usePlayback must be used inside PlaybackProvider");
  return context;
}

function PersistentPlaybackDock() {
  const pathname = usePathname();
  const playback = usePlayback();

  if (pathname === "/visualizer" || pathname === "/app") return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-start px-4 md:bottom-6 md:left-0 md:right-auto md:px-6">
      <div className="pointer-events-auto">
        {playback.controlsVisible ? (
          <TrackPanel
            track={playback.activeTrack}
            isDemo={playback.isDemo}
            spotifyAuthenticated={playback.spotifyAuthenticated}
            authChecked={playback.authChecked}
            premiumRequired={playback.premiumRequired}
            playerReady={playback.playerReady}
            playerError={playback.playerError}
            playerMessage={playback.playerMessage}
            mood={playback.mood}
            layers={playback.layers}
            progress={playback.progress}
            onUseDemo={playback.useDemoMode}
            onUseSpotify={playback.useSpotifyMode}
            onHideControls={playback.hideControls}
            onTogglePlay={playback.togglePlay}
            onNextTrack={playback.nextTrack}
            onPreviousTrack={playback.previousTrack}
            onSeek={playback.seekTrack}
            onMood={playback.setMood}
            onLayer={playback.toggleLayer}
          />
        ) : (
          <button
            type="button"
            onClick={playback.showControls}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-white/10 bg-[#07140d]/82 px-4 text-sm font-medium text-white shadow-xl shadow-emerald-950/30 backdrop-blur transition hover:bg-[#0b1a11]/85"
            aria-label="Show controls"
          >
            <SlidersHorizontal size={16} />
            Controls
          </button>
        )}
      </div>
    </div>
  );
}
