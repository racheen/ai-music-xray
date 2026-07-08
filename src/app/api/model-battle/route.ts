import { NextResponse } from "next/server";
import { runModelBattle } from "@/lib/model-battle/workflow";
import { analysisRequestSchema } from "@/lib/model-battle/schema";
import type { AnalysisMode, ProviderKey } from "@/lib/model-battle/types";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = analysisRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid model battle request",
        issues: parsed.error.flatten(),
        received: body
      },
      { status: 400 }
    );
  }

  try {
    const response = await runModelBattle({
      trackUrl: parsed.data.trackUrl ?? null,
      trackId: parsed.data.trackId ?? null,
      comparisonTrackUrl: parsed.data.comparisonTrackUrl ?? null,
      question: parsed.data.question ?? null,
      mode: (parsed.data.mode ?? null) as AnalysisMode | null,
      providerKeys: parsed.data.providerKeys as ProviderKey[] | null,
      lyricsContext: parsed.data.lyricsContext ?? null,
      useListeningProfile: parsed.data.useListeningProfile ?? true
    });

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to run model battle."
      },
      { status: 500 }
    );
  }
}
