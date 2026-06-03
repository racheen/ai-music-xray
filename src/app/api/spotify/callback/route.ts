import { NextRequest, NextResponse } from "next/server";
import { consumeOauthState, getSpotifyEnv, writeSession } from "@/lib/spotify/session";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const { clientId, clientSecret, redirectUri, appUrl } = await getSpotifyEnv();

  if (!code || !(await consumeOauthState(state))) {
    return NextResponse.redirect(`${appUrl}/login?error=oauth_state`);
  }

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${appUrl}/settings?error=missing_spotify_env`);
  }

  const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri
    })
  });

  if (!tokenResponse.ok) {
    return NextResponse.redirect(`${appUrl}/login?error=spotify_token_exchange`);
  }

  const token = (await tokenResponse.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
  const response = NextResponse.redirect(`${appUrl}/app`);
  writeSession(response, {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: Date.now() + token.expires_in * 1000
  });
  response.cookies.set("spotify_oauth_state", "", { path: "/", maxAge: 0 });
  return response;
}
