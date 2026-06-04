"use client";

import Image from "next/image";
import { EyeOff, Layers, LogIn, Pause, Play, Radio, SkipBack, SkipForward, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { LayerId, Mood, TrackSnapshot } from "@/types/music";

type Props = {
  track: TrackSnapshot | null;
  isDemo: boolean;
  spotifyAuthenticated: boolean;
  authChecked: boolean;
  premiumRequired?: boolean;
  playerReady?: boolean;
  mood: Mood;
  layers: Record<LayerId, boolean>;
  progress: number;
  onUseDemo: () => void;
  onUseSpotify: () => void;
  onHideControls: () => void;
  onTogglePlay: () => void;
  onNextTrack: () => void;
  onPreviousTrack: () => void;
  onSeek: (positionMs: number) => void;
  onMood: (mood: Mood) => void;
  onLayer: (layer: LayerId) => void;
};

const moods: Mood[] = ["chill", "hype", "dark", "dreamy"];
const layerLabels: Array<[LayerId, string]> = [
  ["bass", "Bass"],
  ["drums", "Drums"],
  ["vocals", "Vocals"],
  ["other", "Other"]
];

export function TrackPanel({
  track,
  isDemo,
  spotifyAuthenticated,
  authChecked,
  premiumRequired,
  playerReady,
  mood,
  layers,
  progress,
  onUseDemo,
  onUseSpotify,
  onHideControls,
  onTogglePlay,
  onNextTrack,
  onPreviousTrack,
  onSeek,
  onMood,
  onLayer
}: Props) {
  const progressPct = track ? Math.min(100, (progress / track.durationMs) * 100) : 0;
  const showConnect = authChecked && !spotifyAuthenticated;
  const emptyTitle = spotifyAuthenticated ? "Choose a Spotify track" : "Waiting for playback";
  const emptySubtitle = spotifyAuthenticated
    ? "Open Spotify and select AI Music X-Ray as the device"
    : "Connect Spotify or use demo mode";

  return (
    <aside className="z-10 flex w-full max-w-xl flex-col gap-4 rounded-lg border border-white/10 bg-slate-950/72 p-4 shadow-2xl shadow-cyan-950/40 backdrop-blur md:w-[390px]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Controls</p>
        <button
          type="button"
          onClick={onHideControls}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-white/6 text-slate-300 transition hover:bg-white/10 hover:text-white"
          aria-label="Hide controls"
          title="Hide controls"
        >
          <EyeOff size={15} />
        </button>
      </div>

      <div className="flex gap-4">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-white/10">
          {track?.albumArt ? (
            <Image src={track.albumArt} alt="" fill sizes="80px" className="object-cover" unoptimized={track.albumArt.startsWith("data:")} />
          ) : (
            <Radio className="m-6 h-8 w-8 text-cyan-200" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">{isDemo ? "Demo signal" : "Spotify signal"}</p>
          <h1 className="truncate text-xl font-semibold text-white">{track?.name ?? emptyTitle}</h1>
          <p className="truncate text-sm text-slate-300">{track?.artist ?? emptySubtitle}</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-cyan-300" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </div>

      {premiumRequired ? (
        <div className="rounded-md border border-amber-300/25 bg-amber-300/10 p-3 text-sm text-amber-100">
          Spotify browser playback requires Premium. Demo mode still runs the full visual engine.
        </div>
      ) : null}

      {!isDemo && !playerReady ? (
        <div className="rounded-md border border-white/10 bg-white/6 p-3 text-sm text-slate-300">
          Spotify is connected. Choose “AI Music X-Ray” from your Spotify devices, then start a song.
        </div>
      ) : null}

      <div className="grid gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onPreviousTrack} disabled={!track} className="w-10 px-0" aria-label="Previous track">
            <SkipBack size={16} />
          </Button>
          <Button onClick={onTogglePlay} disabled={!track} className="flex-1">
            {track?.isPlaying ? <Pause size={16} /> : <Play size={16} />}
            {track?.isPlaying ? "Pause" : "Play"}
          </Button>
          <Button variant="ghost" onClick={onNextTrack} disabled={!track} className="w-10 px-0" aria-label="Next track">
            <SkipForward size={16} />
          </Button>
        </div>

        <div className="grid gap-1">
          <input
            type="range"
            min={0}
            max={track?.durationMs ?? 1}
            step={1000}
            value={Math.min(progress, track?.durationMs ?? 0)}
            disabled={!track}
            onChange={(event) => onSeek(Number(event.currentTarget.value))}
            aria-label="Playback position"
            className="h-2 w-full accent-cyan-300 disabled:opacity-45"
          />
          <div className="flex justify-between font-mono text-xs text-slate-400">
            <span>{formatTime(progress)}</span>
            <span>{formatTime(track?.durationMs ?? 0)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {isDemo ? (
          spotifyAuthenticated ? (
            <Button variant="ghost" onClick={onUseSpotify}>
              <Radio size={16} />
              Spotify
            </Button>
          ) : (
            <a href="/api/spotify/login" className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/10 bg-white/6 text-sm font-medium text-white hover:bg-white/10">
              <LogIn size={16} />
              Connect
            </a>
          )
        ) : (
          <Button variant="ghost" onClick={onUseDemo}>
            <Sparkles size={16} />
            Demo
          </Button>
        )}
      </div>

      <div>
        <p className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-400">Mood</p>
        <div className="grid grid-cols-4 gap-2">
          {moods.map((item) => (
            <button
              key={item}
              onClick={() => onMood(item)}
              className={`h-9 rounded-md border text-sm capitalize transition ${
                mood === item ? "border-cyan-200 bg-cyan-300 text-slate-950" : "border-white/10 bg-white/6 text-slate-200 hover:bg-white/10"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-400">
          <Layers size={14} /> Layers
        </p>
        <div className="grid grid-cols-4 gap-2">
          {layerLabels.map(([id, label]) => (
            <button
              key={id}
              onClick={() => onLayer(id)}
              className={`h-9 rounded-md border text-sm transition ${
                layers[id] ? "border-fuchsia-300/70 bg-fuchsia-300/20 text-white" : "border-white/10 bg-transparent text-slate-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {showConnect ? (
        <a href="/api/spotify/login" className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/10 bg-white/6 text-sm text-white hover:bg-white/10">
          <LogIn size={16} />
          Connect Spotify
        </a>
      ) : null}
    </aside>
  );
}

function formatTime(milliseconds: number) {
  const safeMilliseconds = Math.max(0, milliseconds);
  const totalSeconds = Math.floor(safeMilliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
