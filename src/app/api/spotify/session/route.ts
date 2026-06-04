import { NextResponse } from "next/server";
import { getValidSession, writeSession } from "@/lib/spotify/session";

export async function GET() {
  const session = await getValidSession();
  if (!session) {
    return NextResponse.json({ authenticated: false });
  }

  const response = NextResponse.json({
    authenticated: true,
    expiresAt: session.expiresAt
  });
  writeSession(response, session);
  return response;
}
