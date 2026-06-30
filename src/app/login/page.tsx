import { Database, Music2 } from "lucide-react";
import { SpotifyAuthAction } from "@/components/spotify/SpotifyAuthAction";

export default function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return (
    <LoginContent searchParams={searchParams} />
  );
}

async function LoginContent({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#04110a] px-5 text-white">
      <div className="w-full max-w-md rounded-lg border border-white/10 bg-white/[0.07] p-6 shadow-2xl shadow-emerald-950/40">
        <Music2 className="mb-6 h-10 w-10 text-emerald-200" />
        <h1 className="text-3xl font-semibold">Connect Spotify</h1>
        <p className="mt-3 text-slate-300">
          OAuth runs through secure server routes. Your client secret stays on the server, and tokens are stored in HTTP-only cookies.
        </p>
        {params.error ? (
          <div className="mt-5 rounded-md border border-rose-300/25 bg-rose-400/10 p-3 text-sm text-rose-100">
            Spotify login failed: {params.error}
          </div>
        ) : null}
        <div className="mt-6 grid gap-3">
          <SpotifyAuthAction
            connectedLabel="Disconnect Spotify"
            disconnectedLabel="Continue with Spotify"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-emerald-300 px-4 text-sm font-semibold text-slate-950 hover:bg-emerald-200"
          />
          <a href="/app" className="inline-flex h-11 items-center justify-center rounded-md border border-white/10 bg-white/6 px-4 text-sm text-white hover:bg-white/10">
            Open demo mode
          </a>
          <a href="/spotify-history" className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-white/10 bg-white/6 px-4 text-sm text-white hover:bg-white/10">
            <Database size={16} />
            View history JSON
          </a>
        </div>
      </div>
    </main>
  );
}
