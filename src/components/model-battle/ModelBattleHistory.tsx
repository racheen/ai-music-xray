"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, FileSliders, Loader2, Search } from "lucide-react";
import { BattleActionLink, BattlePanel, BattleSectionLabel, BattleShell } from "./BattleShell";
import { OrbitBackdrop } from "./OrbitBackdrop";
import { loadRecentBattleStates } from "@/lib/model-battle/storage";
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
        const localRows = localHistoryRows();
        const merged = mergeRows(payload.runs ?? [], localRows);
        setRows(merged);
        setWarning(payload.warning ?? null);
      } catch {
        if (!cancelled) setRows(localHistoryRows());
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
    <OrbitBackdrop contentClassName="pb-10">
      <BattleShell
        currentRoute="history"
        routeLabel="4. History"
        routePath="/model-battle/history"
        action={<BattleActionLink href="/model-battle" variant="primary">Compare new music</BattleActionLink>}
      >
        <BattlePanel className="p-5 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <BattleSectionLabel
              label="Saved Runs"
              title="Review and reopen previous battles."
              description="Filter by track, artist, or the model that produced the strongest answer, then jump straight back into the saved result."
            />
            <BattleActionLink href="/results">
              View latest results
              <ArrowRight size={16} />
            </BattleActionLink>
          </div>
        </BattlePanel>

        <BattlePanel className="p-4 md:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <BattleSectionLabel label="Archive" title="Saved runs" />
            <div className="flex w-full max-w-md items-center gap-2 rounded-2xl border border-white/10 bg-[#07140d] px-3 py-2">
              <Search size={16} className="text-slate-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search track or artist..."
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
              />
            </div>
          </div>

          {warning ? <p className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-50">{warning}</p> : null}

          <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-white/10">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px] border-separate border-spacing-0 text-left">
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
                          <BattleActionLink href={`/model-battle/results/${row.id}`} className="rounded-xl">
                            Open result
                            <FileSliders size={16} />
                          </BattleActionLink>
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
        </BattlePanel>
      </BattleShell>
    </OrbitBackdrop>
  );
}

function MetricTag({ value, tone }: { value: number; tone: "accent" | "warn" }) {
  const className =
    tone === "accent" ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-50" : "border-amber-300/20 bg-amber-300/10 text-amber-50";
  return <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-medium ${className}`}>{value}%</span>;
}

function localHistoryRows(): AnalysisHistoryRow[] {
  return loadRecentBattleStates().map(({ run }) => ({
    id: run.id,
    createdAt: run.createdAt,
    mode: run.mode,
    trackName: run.track.name,
    artistName: run.track.artistName,
    bestOverallAnswer: run.summary.bestOverallAnswer,
    providerCount: run.providerCount,
    averageConfidence: average(run.outputs.map((output) => output.parsed.confidence)),
    averageHallucinationRisk: average(run.outputs.map((output) => output.hallucinationRisk)),
    summary: run.outputs[0]?.parsed.summary ?? run.summary.bestOverallAnswer
  }));
}

function mergeRows(primary: AnalysisHistoryRow[], fallback: AnalysisHistoryRow[]) {
  const seen = new Set<string>();
  const merged = [...primary, ...fallback].filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
  return merged.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
