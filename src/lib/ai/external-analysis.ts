import type { BeatEvent, TrackAnalysis } from "@/types/music";

export type ExternalAnalysisRequest = {
  trackId: string;
  previewUrl?: string | null;
};

export type ExternalAnalysisResponse = {
  stems: {
    vocals: number[];
    drums: number[];
    bass: number[];
    other: number[];
  };
  beats: BeatEvent[];
  mood: string;
  sections: NonNullable<TrackAnalysis["sections"]>;
};

export interface ExternalAnalysisService {
  analyze(request: ExternalAnalysisRequest): Promise<ExternalAnalysisResponse | null>;
}

export class DisabledExternalAnalysisService implements ExternalAnalysisService {
  async analyze() {
    return null;
  }
}

export function getExternalAnalysisService(): ExternalAnalysisService {
  return new DisabledExternalAnalysisService();
}
