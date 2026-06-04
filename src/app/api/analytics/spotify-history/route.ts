import { NextResponse } from "next/server";
import { spotifyFetch, writeSession } from "@/lib/spotify/session";

type SpotifyRecentlyPlayedResponse = {
  items: Array<{
    played_at: string;
    track: {
      id: string;
      name: string;
      duration_ms?: number;
      album?: {
        name?: string;
      };
      artists: Array<{ id?: string; name: string }>;
    };
  }>;
};

export async function GET() {
  const result = await spotifyFetch("/me/player/recently-played?limit=50");
  if (!result.response || !result.session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  if (!result.response.ok) {
    const response = NextResponse.json(
      {
        error: "Unable to read recent Spotify plays.",
        status: result.response.status,
        note: "This endpoint needs the user-read-recently-played Spotify scope."
      },
      { status: result.response.status }
    );
    writeSession(response, result.session);
    return response;
  }

  const payload = (await result.response.json()) as SpotifyRecentlyPlayedResponse;
  const events = payload.items.map((item) => ({
    playedAt: item.played_at,
    trackId: item.track.id,
    trackName: item.track.name,
    artistId: item.track.artists[0]?.id,
    artistName: item.track.artists[0]?.name,
    albumName: item.track.album?.name,
    durationMs: item.track.duration_ms
  }));

  const response = NextResponse.json({
    source: "spotify_recently_played",
    limitation:
      "Spotify's recently played endpoint is useful for fresh syncs, but not for multi-year backfill. Request Spotify Extended Streaming History for the full Revival Index.",
    exportedAt: new Date().toISOString(),
    events
  });
  writeSession(response, result.session);
  return response;
}
