import { NextResponse } from "next/server";
import { analyzeRevival, type ListeningEvent, type RevivalAnalysisOptions } from "@/lib/analytics/revival";
import { spotifyFetch, writeSession } from "@/lib/spotify/session";

type RevivalRequest = RevivalAnalysisOptions & {
  events?: ListeningEvent[];
  limit?: number;
};

type SpotifyRecentlyPlayedResponse = {
  items: Array<{
    played_at: string;
    track: {
      id: string;
      name: string;
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
        note: "Full revival analysis needs stored listening history or imported Spotify Extended Streaming History."
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
    artistName: item.track.artists[0]?.name
  }));

  const response = NextResponse.json({
    source: "spotify_recently_played",
    limitation: "Spotify recently played data is short-window data. Use POST with stored history for real revival metrics.",
    trackRevival: analyzeRevival(events, { entityType: "track", dormantThresholdDays: 30 }),
    artistRevival: analyzeRevival(events, { entityType: "artist", dormantThresholdDays: 30 })
  });
  writeSession(response, result.session);
  return response;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as RevivalRequest;
  const events = Array.isArray(body.events) ? body.events : [];
  const limit = Math.min(Math.max(body.limit ?? 50, 1), 250);

  if (events.length === 0) {
    return NextResponse.json(
      {
        error: "POST an events array with playedAt, trackId, and optional artist fields.",
        example: {
          events: [
            {
              playedAt: "2021-02-14T03:10:00.000Z",
              trackId: "spotify-track-id",
              trackName: "Song name",
              artistId: "spotify-artist-id",
              artistName: "Artist name"
            }
          ],
          entityType: "track",
          dormantThresholdDays: 180,
          comebackWindowDays: 90
        }
      },
      { status: 400 }
    );
  }

  const metrics = analyzeRevival(events, body).slice(0, limit);
  return NextResponse.json({
    source: "posted_events",
    entityType: body.entityType ?? "track",
    count: metrics.length,
    metrics
  });
}
