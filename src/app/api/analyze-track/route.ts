import { NextResponse } from "next/server";
import { analyzeTrackWithService } from "@/lib/analysis/client";
import { createFallbackAnalysis } from "@/lib/analysis/fallback";
import type { AnalysisResponse } from "@/lib/analysis/schema";

function buildSimulatedAnalysis(input: {
  trackId: string;
  durationMs?: number;
  previewUrl?: string | null;
}): AnalysisResponse {
  const fallback = createFallbackAnalysis({ trackId: input.trackId, durationMs: input.durationMs });
  return {
    trackId: input.trackId,
    tempo: fallback.tempo ?? 120,
    beats: fallback.beats.map((beat) => ({
      start: beat.start,
      duration: beat.duration,
      confidence: beat.confidence ?? 0.72
    })),
    sections: fallback.sections ?? [],
    mood: "chill",
    stems: {
      vocals: 0.58,
      drums: 0.74,
      bass: 0.66,
      other: 0.43
    }
  };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    trackId?: string;
    previewUrl?: string | null;
    durationMs?: number;
  } | null;

  if (!body?.trackId) {
    return NextResponse.json({ error: "trackId is required" }, { status: 400 });
  }

  const liveAnalysis = await analyzeTrackWithService({
    trackId: body.trackId,
    previewUrl: body.previewUrl ?? null,
    durationMs: body.durationMs
  });

  if (liveAnalysis) {
    return NextResponse.json({
      ...liveAnalysis,
      source: "python-service"
    });
  }

  return NextResponse.json({
    ...buildSimulatedAnalysis({
      trackId: body.trackId,
      durationMs: body.durationMs,
      previewUrl: body.previewUrl
    }),
    source: "simulated"
  });
}
