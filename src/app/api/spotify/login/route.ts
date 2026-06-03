import { NextResponse } from "next/server";
import { createOauthState, getSpotifyEnv } from "@/lib/spotify/session";

const scopes = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing"
];

export async function GET() {
  const { clientId, redirectUri, appUrl } = await getSpotifyEnv();
  if (!clientId) {
    return NextResponse.redirect(`${appUrl}/settings?error=missing_spotify_client_id`);
  }

  const response = NextResponse.redirect("https://accounts.spotify.com/authorize");
  const state = await createOauthState(response);
  const url = new URL("https://accounts.spotify.com/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("scope", scopes.join(" "));
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("show_dialog", "true");

  response.headers.set("Location", url.toString());
  return response;
}
