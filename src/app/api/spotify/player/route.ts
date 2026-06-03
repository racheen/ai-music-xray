import { NextResponse } from "next/server";
import { playbackToSnapshot } from "@/lib/spotify/mapper";
import { spotifyFetch, writeSession } from "@/lib/spotify/session";
import type { SpotifyPlayback } from "@/lib/spotify/types";

export async function GET() {
  const { response, session } = await spotifyFetch("/me/player");
  if (!response || !session) return NextResponse.json({ authenticated: false }, { status: 401 });

  if (response.status === 204) {
    const empty = NextResponse.json({ track: null, message: "No active Spotify playback." });
    writeSession(empty, session);
    return empty;
  }

  const playback = (await response.json()) as SpotifyPlayback;
  const json = NextResponse.json({ track: playbackToSnapshot(playback) });
  writeSession(json, session);
  return json;
}

export async function PUT(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { action?: "play" | "pause" | "toggle" };
  const action = body.action === "pause" ? "pause" : "play";
  const { response, session } = await spotifyFetch(`/me/player/${action}`, { method: "PUT" });
  if (!response || !session) return NextResponse.json({ authenticated: false }, { status: 401 });
  const json = NextResponse.json({ ok: response.ok, status: response.status });
  writeSession(json, session);
  return json;
}
