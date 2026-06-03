import { NextRequest, NextResponse } from "next/server";
import { createFallbackAnalysis } from "@/lib/analysis/fallback";
import { spotifyFetch, writeSession } from "@/lib/spotify/session";

type SpotifyAudioAnalysis = {
  track?: { tempo?: number; duration?: number };
  beats?: Array<{ start: number; duration: number; confidence?: number }>;
  bars?: Array<{ start: number; duration: number; confidence?: number }>;
  sections?: Array<{ start: number; duration: number; loudness?: number; tempo?: number }>;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackId: string }> }
) {
  const { trackId } = await params;
  const durationMs = Number(request.nextUrl.searchParams.get("durationMs") ?? 0) || undefined;

  const analysisResult = await spotifyFetch(`/audio-analysis/${trackId}`);
  if (analysisResult.response?.ok && analysisResult.session) {
    const data = (await analysisResult.response.json()) as SpotifyAudioAnalysis;
    const response = NextResponse.json({
      source: "spotify",
      analysis: {
        tempo: data.track?.tempo,
        beats: data.beats ?? [],
        bars: data.bars,
        sections: data.sections
      }
    });
    writeSession(response, analysisResult.session);
    return response;
  }

  const featuresResult = await spotifyFetch(`/audio-features/${trackId}`);
  let tempo: number | undefined;
  if (featuresResult.response?.ok) {
    const features = (await featuresResult.response.json()) as { tempo?: number };
    tempo = features.tempo;
  }

  return NextResponse.json({
    source: "fallback",
    reason:
      analysisResult.response?.status === 403
        ? "Spotify audio analysis is unavailable for this developer account."
        : "Using generated beat data.",
    analysis: createFallbackAnalysis({ trackId, durationMs, tempo })
  });
}
