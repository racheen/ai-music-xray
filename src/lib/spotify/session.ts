import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export type SpotifySession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

const SESSION_COOKIE = "spotify_session";
const STATE_COOKIE = "spotify_oauth_state";

export async function getSpotifyEnv() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectUri =
    process.env.SPOTIFY_REDIRECT_URI ?? `${appUrl.replace(/\/$/, "")}/api/spotify/callback`;

  return { clientId, clientSecret, appUrl, redirectUri };
}

export async function readSession(): Promise<SpotifySession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  try {
    return JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as SpotifySession;
  } catch {
    return null;
  }
}

export function writeSession(response: NextResponse, session: SpotifySession) {
  response.cookies.set(SESSION_COOKIE, Buffer.from(JSON.stringify(session)).toString("base64url"), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
}

export function clearSession(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
}

export async function createOauthState(response: NextResponse) {
  const state = crypto.randomUUID();
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10
  });
  return state;
}

export async function consumeOauthState(received: string | null) {
  const cookieStore = await cookies();
  const expected = cookieStore.get(STATE_COOKIE)?.value;
  return Boolean(received && expected && received === expected);
}

export async function refreshSpotifyToken(refreshToken: string): Promise<SpotifySession | null> {
  const { clientId, clientSecret } = await getSpotifyEnv();
  if (!clientId || !clientSecret) return null;

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken })
  });

  if (!response.ok) return null;
  const data = (await response.json()) as { access_token: string; expires_in: number; refresh_token?: string };
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000
  };
}

export async function getValidSession(): Promise<SpotifySession | null> {
  const session = await readSession();
  if (!session) return null;
  if (session.expiresAt - Date.now() > 60_000) return session;
  return refreshSpotifyToken(session.refreshToken);
}

export async function spotifyFetch(path: string, init?: RequestInit) {
  const session = await getValidSession();
  if (!session) return { response: null, session: null };

  const response = await fetch(`https://api.spotify.com/v1${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${session.accessToken}`
    },
    cache: "no-store"
  });

  return { response, session };
}
