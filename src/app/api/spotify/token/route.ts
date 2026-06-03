import { NextResponse } from "next/server";
import { getValidSession, writeSession } from "@/lib/spotify/session";

export async function GET() {
  const session = await getValidSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const response = NextResponse.json({
    authenticated: true,
    accessToken: session.accessToken,
    expiresAt: session.expiresAt
  });
  writeSession(response, session);
  return response;
}
