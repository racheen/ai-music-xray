export type BeatEvent = {
  start: number;
  duration: number;
  confidence?: number;
};

export type TrackAnalysis = {
  tempo?: number;
  beats: BeatEvent[];
  bars?: BeatEvent[];
  sections?: Array<{
    start: number;
    duration: number;
    loudness?: number;
    tempo?: number;
  }>;
  mood?: Mood;
  stems?: StemFrame;
};

export type StemFrame = {
  vocals: number;
  drums: number;
  bass: number;
  other: number;
};

export type Mood = "chill" | "hype" | "dark" | "dreamy";

export type LayerId = "bass" | "drums" | "vocals" | "other";

export type TrackSnapshot = {
  id: string;
  name: string;
  artist: string;
  albumArt?: string;
  durationMs: number;
  progressMs: number;
  isPlaying: boolean;
  tempo?: number;
  previewUrl?: string | null;
  source: "spotify" | "demo";
};
