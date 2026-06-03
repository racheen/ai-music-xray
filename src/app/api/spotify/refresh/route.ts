import { NextResponse } from "next/server";
import { readSession, refreshSpotifyToken, writeSession } from "@/lib/spotify/session";

export async function POST() {
  const session = await readSession();
  if (!session) return NextResponse.json({ authenticated: false }, { status: 401 });

  const refreshed = await refreshSpotifyToken(session.refreshToken);
  if (!refreshed) return NextResponse.json({ authenticated: false }, { status: 401 });

  const response = NextResponse.json({ authenticated: true, expiresAt: refreshed.expiresAt });
  writeSession(response, refreshed);
  return response;
}
