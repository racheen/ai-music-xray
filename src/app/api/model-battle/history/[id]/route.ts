import { NextResponse } from "next/server";
import { getAnalysisRunById } from "@/lib/model-battle/db";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, { params }: Params) {
  const { id } = await params;
  try {
    const run = await getAnalysisRunById(id);
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }
    return NextResponse.json({ run });
  } catch (error) {
    console.warn("model-battle run unavailable", error);
    return NextResponse.json({ error: "Unable to load run" }, { status: 500 });
  }
}
