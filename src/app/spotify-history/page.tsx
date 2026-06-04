"use client";

import Link from "next/link";
import { Database, ExternalLink, History, Loader2, LogIn, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type HistoryEvent = {
  playedAt: string;
  trackId: string;
  trackName: string;
  artistId?: string;
  artistName?: string;
  albumName?: string;
  durationMs?: number;
};

type HistoryResponse = {
  authenticated?: false;
  error?: string;
  status?: number;
  source?: string;
  limitation?: string;
  exportedAt?: string;
  events?: HistoryEvent[];
};

export default function SpotifyHistoryPage() {
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadHistory() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/analytics/spotify-history", { cache: "no-store" });
      const payload = (await response.json()) as HistoryResponse;
      setData(payload);
      if (!response.ok && payload.error) setError(payload.error);
    } catch {
      setError("Unable to load Spotify history.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadHistory();
  }, []);

  const events = data?.events ?? [];
  const rawJson = useMemo(() => JSON.stringify(data ?? {}, null, 2), [data]);

  return (
    <main className="min-h-dvh bg-slate-950 px-5 py-8 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <nav className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="text-sm font-semibold tracking-[0.24em] text-cyan-100">
            AI MUSIC X-RAY
          </Link>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link href="/app" className="inline-flex h-10 items-center justify-center rounded-md border border-white/10 bg-white/6 px-3 text-slate-200 hover:bg-white/10">
              Visualizer
            </Link>
            <a href="/api/analytics/spotify-history" className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/10 bg-white/6 px-3 text-slate-200 hover:bg-white/10">
              <ExternalLink size={16} />
              Raw API
            </a>
          </div>
        </nav>

        <header className="flex flex-col gap-4 border-b border-white/10 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.22em] text-cyan-200">
              <History size={16} />
              Recent Spotify JSON
            </p>
            <h1 className="text-4xl font-semibold md:text-5xl">Spotify history preview</h1>
            <p className="mt-3 max-w-2xl text-slate-300">
              A readable view of the recent-play JSON returned by Spotify. This is useful for testing the Revival Index pipeline while you wait for the full Extended Streaming History export.
            </p>
          </div>
          <button
            onClick={() => void loadHistory()}
            disabled={loading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-cyan-300 px-4 text-sm font-semibold text-slate-950 hover:bg-cyan-200 disabled:opacity-60"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
            Refresh
          </button>
        </header>

        {loading ? (
          <section className="flex min-h-64 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05]">
            <div className="flex items-center gap-3 text-slate-300">
              <Loader2 className="animate-spin text-cyan-200" />
              Loading Spotify history
            </div>
          </section>
        ) : data?.authenticated === false ? (
          <section className="rounded-lg border border-amber-300/25 bg-amber-300/10 p-5 text-amber-100">
            <h2 className="text-xl font-semibold">Spotify is not connected</h2>
            <p className="mt-2 text-sm text-amber-50/85">
              Log in first, then come back to this page. The browser needs the Spotify session cookie to call the history endpoint.
            </p>
            <a href="/api/spotify/login" className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-amber-200 px-4 text-sm font-semibold text-slate-950 hover:bg-amber-100">
              <LogIn size={16} />
              Login with Spotify
            </a>
          </section>
        ) : error ? (
          <section className="rounded-lg border border-rose-300/25 bg-rose-400/10 p-5 text-rose-100">
            <h2 className="text-xl font-semibold">History request failed</h2>
            <p className="mt-2 text-sm">{error}</p>
          </section>
        ) : (
          <>
            <section className="grid gap-3 md:grid-cols-3">
              <Metric label="Events" value={events.length.toString()} />
              <Metric label="Source" value={data?.source ?? "unknown"} />
              <Metric label="Exported" value={data?.exportedAt ? new Date(data.exportedAt).toLocaleString() : "not available"} />
            </section>

            {data?.limitation ? (
              <section className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm text-cyan-50">
                {data.limitation}
              </section>
            ) : null}

            <section className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.05]">
              <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                <Database size={16} className="text-cyan-200" />
                <h2 className="font-semibold">Recent plays</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-white/[0.06] text-xs uppercase tracking-[0.14em] text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Played</th>
                      <th className="px-4 py-3">Track</th>
                      <th className="px-4 py-3">Artist</th>
                      <th className="px-4 py-3">Album</th>
                      <th className="px-4 py-3">Track ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {events.map((event) => (
                      <tr key={`${event.trackId}-${event.playedAt}`} className="text-slate-200">
                        <td className="whitespace-nowrap px-4 py-3 text-slate-300">{new Date(event.playedAt).toLocaleString()}</td>
                        <td className="px-4 py-3 font-medium text-white">{event.trackName}</td>
                        <td className="px-4 py-3">{event.artistName ?? "Unknown"}</td>
                        <td className="px-4 py-3 text-slate-300">{event.albumName ?? "Unknown"}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-400">{event.trackId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {events.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-400">
                  No recent plays returned yet.
                </div>
              ) : null}
            </section>

            <section className="rounded-lg border border-white/10 bg-slate-900/80">
              <div className="border-b border-white/10 px-4 py-3">
                <h2 className="font-semibold">Raw JSON</h2>
              </div>
              <pre className="max-h-[420px] overflow-auto p-4 text-xs leading-6 text-slate-200">{rawJson}</pre>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.05] p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 break-words text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
