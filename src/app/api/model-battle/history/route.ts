import { NextResponse } from "next/server";
import { listAnalysisRuns } from "@/lib/model-battle/db";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "20");
  try {
    const runs = await listAnalysisRuns(Number.isFinite(limit) ? Math.max(1, Math.min(limit, 100)) : 20);
    return NextResponse.json({ runs });
  } catch (error) {
    console.warn("model-battle history unavailable", error);
    return NextResponse.json(
      {
        runs: [],
        warning: "Model battle history is unavailable until the database migration has been applied."
      },
      { status: 200 }
    );
  }
}
