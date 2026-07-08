"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, FileSliders, Loader2, Search } from "lucide-react";
import { OrbitBackdrop } from "./OrbitBackdrop";
import type { AnalysisHistoryRow } from "@/lib/model-battle/types";

type HistoryPayload = {
  runs?: AnalysisHistoryRow[];
  warning?: string;
};

export function ModelBattleHistory() {
  const [rows, setRows] = useState<AnalysisHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const response = await fetch("/api/model-battle/history?limit=100", { cache: "no-store" });
        const payload = (await response.json()) as HistoryPayload;
        if (cancelled) return;
        setRows(payload.runs ?? []);
        setWarning(payload.warning ?? null);
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = query.toLowerCase();
    return rows.filter((row) => [row.trackName, row.artistName, row.bestOverallAnswer].some((value) => value.toLowerCase().includes(needle)));
  }, [query, rows]);

  return (
    <OrbitBackdrop contentClassName="px-4 py-6 md:px-6 lg:px-8">
      <main className="mx-auto flex min-h-dvh max-w-7xl flex-col gap-6">
        <header className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-emerald-950/15 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-400">
                <CalendarDays size={14} />
                History
              </div>
              <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">Previous battles</h1>
              <p className="text-base leading-7 text-slate-300 md:text-lg">
                Review prior comparisons, open the full result, and jump back into the same musical question whenever you need a second pass.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/model-battle" className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-emerald-300 px-4 text-sm font-medium text-slate-950 hover:bg-emerald-200">
                Compare New Music
                <ArrowRight size={16} />
              </Link>
              <Link href="/results" className="inline-flex h-11 items-center justify-center rounded-md border border-white/12 bg-white/6 px-4 text-sm font-medium text-white hover:bg-white/10">
                View Latest Results
              </Link>
            </div>
          </div>
        </header>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 md:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Saved runs</p>
              <h2 className="mt-1 text-2xl font-semibold">Archive</h2>
            </div>
            <div className="flex w-full max-w-md items-center gap-2 rounded-2xl border border-white/10 bg-[#07140d] px-3 py-2">
              <Search size={16} className="text-slate-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter track, artist, or best model"
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
              />
            </div>
          </div>

          {warning ? <p className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-50">{warning}</p> : null}

          <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-white/10">
            <div className="overflow-x-auto">
              <table className="min-w-[1120px] w-full border-separate border-spacing-0 text-left">
                <thead>
                  <tr>
                    <th className="sticky left-0 top-0 z-30 border-b border-r border-white/10 bg-[#06120c] px-4 py-4 text-xs uppercase tracking-[0.22em] text-slate-400">Track</th>
                    <th className="border-b border-white/10 bg-[#06120c] px-4 py-4 text-xs uppercase tracking-[0.22em] text-slate-400">Artist</th>
                    <th className="border-b border-white/10 bg-[#06120c] px-4 py-4 text-xs uppercase tracking-[0.22em] text-slate-400">Date</th>
                    <th className="border-b border-white/10 bg-[#06120c] px-4 py-4 text-xs uppercase tracking-[0.22em] text-slate-400">Models</th>
                    <th className="border-b border-white/10 bg-[#06120c] px-4 py-4 text-xs uppercase tracking-[0.22em] text-slate-400">Best model</th>
                    <th className="border-b border-white/10 bg-[#06120c] px-4 py-4 text-xs uppercase tracking-[0.22em] text-slate-400">Confidence</th>
                    <th className="border-b border-white/10 bg-[#06120c] px-4 py-4 text-xs uppercase tracking-[0.22em] text-slate-400">Hallucination risk</th>
                    <th className="border-b border-white/10 bg-[#06120c] px-4 py-4 text-xs uppercase tracking-[0.22em] text-slate-400">Open</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td className="px-4 py-12 text-center text-slate-400" colSpan={8}>
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="animate-spin" size={16} />
                          Loading saved battles...
                        </span>
                      </td>
                    </tr>
                  ) : filtered.length ? (
                    filtered.map((row, index) => (
                      <tr key={row.id} className={index % 2 === 0 ? "bg-white/[0.015]" : "bg-white/[0.03]"}>
                        <td className="sticky left-0 z-20 border-r border-white/10 bg-[#07140d] px-4 py-4 font-medium text-white">{row.trackName}</td>
                        <td className="px-4 py-4 text-slate-300">{row.artistName}</td>
                        <td className="px-4 py-4 text-slate-300">{new Date(row.createdAt).toLocaleString()}</td>
                        <td className="px-4 py-4">
                          <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-200">
                            {row.providerCount}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-slate-200">{row.bestOverallAnswer}</td>
                        <td className="px-4 py-4">
                          <MetricTag value={Math.round(row.averageConfidence * 100)} tone="accent" />
                        </td>
                        <td className="px-4 py-4">
                          <MetricTag value={Math.round(row.averageHallucinationRisk)} tone="warn" />
                        </td>
                        <td className="px-4 py-4">
                          <Link
                            href={`/results?runId=${row.id}`}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/12 bg-white/6 px-4 text-sm font-medium text-white hover:bg-white/10"
                          >
                            Open result
                            <FileSliders size={16} />
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-4 py-12 text-center text-slate-400" colSpan={8}>
                        No saved runs match this search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </OrbitBackdrop>
  );
}

function MetricTag({ value, tone }: { value: number; tone: "accent" | "warn" }) {
  const className =
    tone === "accent" ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-50" : "border-amber-300/20 bg-amber-300/10 text-amber-50";
  return <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-medium ${className}`}>{value}%</span>;
}
