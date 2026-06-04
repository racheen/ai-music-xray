"use client";

import { LogIn, LogOut } from "lucide-react";
import { useEffect, useState } from "react";

type Props = {
  className?: string;
  connectedLabel?: string;
  disconnectedLabel?: string;
};

type SessionResponse = {
  authenticated: boolean;
};

export function SpotifyAuthAction({
  className,
  connectedLabel = "Logout",
  disconnectedLabel = "Login"
}: Props) {
  const [authenticated, setAuthenticated] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      try {
        const response = await fetch("/api/spotify/session", { cache: "no-store" });
        const session = (await response.json()) as SessionResponse;
        if (!cancelled) setAuthenticated(session.authenticated);
      } catch {
        if (!cancelled) setAuthenticated(false);
      } finally {
        if (!cancelled) setChecked(true);
      }
    }

    void checkSession();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!checked) {
    return <span className={className}>Checking Spotify</span>;
  }

  if (authenticated) {
    return (
      <a href="/api/spotify/logout" className={className}>
        <LogOut size={16} />
        {connectedLabel}
      </a>
    );
  }

  return (
    <a href="/api/spotify/login" className={className}>
      <LogIn size={16} />
      {disconnectedLabel}
    </a>
  );
}
