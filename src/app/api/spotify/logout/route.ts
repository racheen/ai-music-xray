import { NextResponse } from "next/server";
import { clearSession, getSpotifyEnv } from "@/lib/spotify/session";

export async function POST() {
  const { appUrl } = await getSpotifyEnv();
  const response = NextResponse.redirect(`${appUrl}/login`, { status: 303 });
  clearSession(response);
  return response;
}
