import type { Mood, StemFrame, TrackAnalysis } from "@/types/music";

export type AnalysisSection = NonNullable<TrackAnalysis["sections"]>[number];

export type AnalysisResponse = {
  trackId: string;
  tempo: number;
  beats: Array<{
    start: number;
    duration: number;
    confidence: number;
  }>;
  sections: AnalysisSection[];
  mood: Mood;
  stems: StemFrame;
};

export type AnalysisServicePayload = {
  trackId: string;
  previewUrl?: string | null;
  durationMs?: number;
};
