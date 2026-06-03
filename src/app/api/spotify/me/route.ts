import { NextResponse } from "next/server";
import { spotifyFetch, writeSession } from "@/lib/spotify/session";

export async function GET() {
  const { response, session } = await spotifyFetch("/me");
  if (!response || !session) return NextResponse.json({ authenticated: false }, { status: 401 });

  const payload = await response.json();
  const json = NextResponse.json(payload, { status: response.status });
  writeSession(json, session);
  return json;
}
