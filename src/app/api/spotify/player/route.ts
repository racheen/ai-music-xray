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
  const body = (await request.json().catch(() => ({}))) as {
    action?: "play" | "pause" | "toggle" | "next" | "previous" | "seek" | "transfer";
    deviceId?: string;
    positionMs?: number;
  };

  const requestOptions = getPlayerRequest(body);
  if (!requestOptions) {
    return NextResponse.json({ error: "Unsupported Spotify player action." }, { status: 400 });
  }

  const { response, session } = await spotifyFetch(requestOptions.path, requestOptions.init);
  if (!response || !session) return NextResponse.json({ authenticated: false }, { status: 401 });
  const json = NextResponse.json({ ok: response.ok, status: response.status });
  writeSession(json, session);
  return json;
}

function getPlayerRequest(body: { action?: string; deviceId?: string; positionMs?: number }) {
  if (body.action === "pause") return { path: "/me/player/pause", init: { method: "PUT" } };
  if (body.action === "next") return { path: "/me/player/next", init: { method: "POST" } };
  if (body.action === "previous") return { path: "/me/player/previous", init: { method: "POST" } };
  if (body.action === "transfer") {
    if (!body.deviceId) return null;
    return {
      path: "/me/player",
      init: {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_ids: [body.deviceId], play: false })
      }
    };
  }
  if (body.action === "seek") {
    const positionMs = Math.max(0, Math.round(body.positionMs ?? 0));
    return { path: `/me/player/seek?position_ms=${positionMs}`, init: { method: "PUT" } };
  }
  if (body.action === "play" || body.action === "toggle" || !body.action) {
    return { path: "/me/player/play", init: { method: "PUT" } };
  }
  return null;
}
