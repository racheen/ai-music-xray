import { NextResponse } from "next/server";
import { createFallbackAnalysis } from "@/lib/analysis/fallback";
import { getExternalAnalysisService } from "@/lib/ai/external-analysis";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { trackId?: string; previewUrl?: string | null } | null;
  if (!body?.trackId) {
    return NextResponse.json({ error: "trackId is required" }, { status: 400 });
  }

  const external = await getExternalAnalysisService().analyze({
    trackId: body.trackId,
    previewUrl: body.previewUrl
  });
  if (external) return NextResponse.json(external);

  const analysis = createFallbackAnalysis({ trackId: body.trackId });
  return NextResponse.json({
    stems: {
      vocals: [0.2, 0.4, 0.65, 0.5],
      drums: [0.8, 0.1, 0.72, 0.18],
      bass: [0.62, 0.7, 0.45, 0.68],
      other: [0.32, 0.56, 0.4, 0.73]
    },
    beats: analysis.beats,
    mood: "demo",
    sections: analysis.sections ?? []
  });
}
