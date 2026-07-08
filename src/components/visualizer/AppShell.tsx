"use client";

import Link from "next/link";
import { useEffect } from "react";
import type { LayerId } from "@/types/music";
import { usePlayback } from "@/components/playback/PlaybackProvider";
import { TrackPanel } from "@/components/spotify/TrackPanel";
import { LogIn, LogOut, SlidersHorizontal } from "lucide-react";
import { MusicVisualizer } from "./MusicVisualizer";

export function AppShell() {
  const playback = usePlayback();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.code === "Space") {
        event.preventDefault();
        playback.togglePlay();
      }
      if (event.key.toLowerCase() === "m") {
        const moods = ["chill", "hype", "dark", "dreamy"] as const;
        const index = moods.indexOf(playback.mood);
        playback.setMood(moods[(index + 1) % moods.length]);
      }
      if (event.key.toLowerCase() === "l") {
        const ids = Object.keys(playback.layers) as LayerId[];
        const firstOff = ids.find((id) => !playback.layers[id]);
        ids.forEach((id) => {
          const shouldEnable = firstOff ? true : id !== "drums";
          if (playback.layers[id] !== shouldEnable) playback.toggleLayer(id);
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playback]);

  return (
    <main className="relative h-dvh w-dvw max-w-[100dvw] overflow-hidden bg-[#04110a] text-white">
      <MusicVisualizer
        analysis={playback.analysis}
        progressMs={playback.progress}
        isPlaying={playback.activeTrack?.isPlaying ?? false}
        mood={playback.mood}
        layers={playback.layers}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,transparent_0,rgba(4,17,10,.18)_32%,rgba(4,17,10,.82)_100%)]" />
      <div className="relative z-10 flex h-dvh w-full max-w-full flex-col justify-between gap-8 overflow-hidden px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] md:p-8">
        <div className="flex min-w-0 items-center justify-between gap-3 text-[11px] uppercase tracking-[0.28em] text-emerald-200/90">
          <div className="flex min-w-0 items-center gap-3">
            <span className="truncate font-semibold">5. Visualizer</span>
            <span className="truncate text-slate-500">/visualizer</span>
          </div>
        </div>

        <nav className="flex min-w-0 items-center justify-between gap-3 rounded-[1.7rem] border border-white/10 bg-black/25 px-4 py-3 shadow-[0_18px_80px_rgba(2,8,4,0.38)] backdrop-blur-xl">
          <Link href="/" className="min-w-0 truncate text-sm font-semibold tracking-[0.18em] text-emerald-100 sm:tracking-[0.24em]">
            AI MUSIC X-RAY
          </Link>
          <div className="hidden shrink-0 items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-300 md:flex sm:gap-3">
            <Link href="/model-battle" className="hover:text-white">Model Battle</Link>
            <Link href="/visualizer" className="border-b border-emerald-300 pb-1 text-white">Visualizer</Link>
            <Link href="/model-battle/history" className="hover:text-white">History</Link>
            <Link href="/settings" className="hover:text-white">Settings</Link>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-sm text-slate-300 sm:gap-3">
            {playback.authChecked && playback.spotifyAuthenticated ? (
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
        <div className="flex min-w-0 flex-1 items-end">
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
              className="inline-flex h-11 items-center gap-2 rounded-full border border-white/10 bg-[#07140d]/72 px-4 text-sm font-medium text-white shadow-xl shadow-emerald-950/30 backdrop-blur transition hover:bg-[#0b1a11]/85"
              aria-label="Show controls"
            >
              <SlidersHorizontal size={16} />
              Controls
            </button>
          )}
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs text-slate-500">
          <span>&copy; 2026 AI Music X-Ray. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link href="/settings" className="hover:text-slate-300">Privacy Policy</Link>
            <Link href="/settings" className="hover:text-slate-300">Terms of Service</Link>
            <Link href="/settings" className="hover:text-slate-300">Contact</Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
