"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createFallbackAnalysis } from "@/lib/analysis/fallback";
import type { LayerId, Mood, TrackAnalysis, TrackSnapshot } from "@/types/music";
import { demoTrack } from "@/components/spotify/demoTrack";
import { TrackPanel } from "@/components/spotify/TrackPanel";
import { useSpotifyPlayer } from "@/components/spotify/useSpotifyPlayer";
import { Database, LogIn, LogOut, SlidersHorizontal } from "lucide-react";
import { MusicVisualizer } from "./MusicVisualizer";

const initialLayers: Record<LayerId, boolean> = {
  bass: true,
  drums: true,
  vocals: true,
  other: true
};

export function AppShell() {
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

  useEffect(() => {
    if (!analysisTrackId || !analysisDurationMs || !analysisSource) return;
    let cancelled = false;
    async function loadAnalysis() {
      if (analysisSource === "demo") {
        setAnalysis(createFallbackAnalysis({ trackId: analysisTrackId!, durationMs: analysisDurationMs, tempo: analysisTempo }));
        return;
      }
      const response = await fetch(`/api/spotify/analysis/${analysisTrackId}?durationMs=${analysisDurationMs}`, { cache: "no-store" });
      if (!response.ok) {
        setAnalysis(createFallbackAnalysis({ trackId: analysisTrackId!, durationMs: analysisDurationMs }));
        return;
      }
      const data = (await response.json()) as { analysis: TrackAnalysis };
      if (!cancelled) setAnalysis(data.analysis);
    }
    void loadAnalysis();
    return () => {
      cancelled = true;
    };
  }, [analysisDurationMs, analysisSource, analysisTempo, analysisTrackId]);

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

  const cycleMood = useCallback(() => {
    const moods: Mood[] = ["chill", "hype", "dark", "dreamy"];
    setMood((current) => moods[(moods.indexOf(current) + 1) % moods.length]);
  }, []);

  const toggleLayer = useCallback((layer: LayerId) => {
    setLayers((current) => ({ ...current, [layer]: !current[layer] }));
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.code === "Space") {
        event.preventDefault();
        togglePlay();
      }
      if (event.key.toLowerCase() === "m") cycleMood();
      if (event.key.toLowerCase() === "l") {
        const ids = Object.keys(layers) as LayerId[];
        const firstOff = ids.find((id) => !layers[id]);
        if (firstOff) setLayers(initialLayers);
        else setLayers({ bass: true, drums: false, vocals: true, other: true });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cycleMood, layers, togglePlay]);

  const progress = activeTrack?.progressMs ?? 0;
  const useDemoMode = useCallback(() => setIsDemo(true), []);
  const useSpotifyMode = useCallback(() => setIsDemo(false), []);
  const showControls = useCallback(() => setControlsVisible(true), []);
  const hideControls = useCallback(() => setControlsVisible(false), []);

  return (
    <main className="relative min-h-dvh overflow-hidden bg-slate-950 text-white">
      <MusicVisualizer
        analysis={analysis}
        progressMs={progress}
        isPlaying={activeTrack?.isPlaying ?? false}
        mood={mood}
        layers={layers}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,transparent_0,rgba(2,6,23,.2)_32%,rgba(2,6,23,.78)_100%)]" />
      <div className="relative z-10 flex min-h-dvh flex-col justify-between gap-8 p-4 md:p-8">
        <nav className="flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold tracking-[0.24em] text-cyan-100">AI MUSIC X-RAY</Link>
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <Link href="/settings" className="hover:text-white">Settings</Link>
            <Link href="/spotify-history" className="inline-flex items-center gap-1 hover:text-white">
              <Database size={15} />
              History
            </Link>
            {authChecked && spotifyAuthenticated ? (
              <a href="/api/spotify/logout" className="inline-flex items-center gap-1 hover:text-white">
                <LogOut size={15} />
                Logout
              </a>
            ) : (
              <a href="/api/spotify/login" className="inline-flex items-center gap-1 hover:text-white">
                <LogIn size={15} />
                Login
              </a>
            )}
          </div>
        </nav>
        <div className="flex flex-1 items-end">
          {controlsVisible ? (
            <TrackPanel
              track={activeTrack}
              isDemo={isDemo}
              spotifyAuthenticated={spotifyAuthenticated}
              authChecked={authChecked}
              premiumRequired={status.premiumRequired}
              playerReady={status.ready}
              mood={mood}
              layers={layers}
              progress={progress}
              onUseDemo={useDemoMode}
              onUseSpotify={useSpotifyMode}
              onHideControls={hideControls}
              onTogglePlay={togglePlay}
              onNextTrack={nextTrack}
              onPreviousTrack={previousTrack}
              onSeek={seekTrack}
              onMood={setMood}
              onLayer={toggleLayer}
            />
          ) : (
            <button
              type="button"
              onClick={showControls}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-white/10 bg-slate-950/72 px-4 text-sm font-medium text-white shadow-xl shadow-cyan-950/30 backdrop-blur transition hover:bg-slate-900/85"
              aria-label="Show controls"
            >
              <SlidersHorizontal size={16} />
              Controls
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
