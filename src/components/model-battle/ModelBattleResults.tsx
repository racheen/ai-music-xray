"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, ChevronDown, ExternalLink, Music2, Radar, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { OrbitBackdrop } from "./OrbitBackdrop";
import { ModelBattleOrbit } from "./ModelBattleOrbit";
import { loadLastBattleState } from "@/lib/model-battle/storage";
import type { ModelAnalysisRun, ModelBattleOutput } from "@/lib/model-battle/types";

type BattleState = {
  run: ModelAnalysisRun;
};

type MetricCard = {
  label: string;
  value: string;
  tone?: "default" | "accent" | "warn";
};

export function ModelBattleResults() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const runId = searchParams.get("runId");
      const stored = loadLastBattleState();
      if (stored) {
        if (!cancelled) {
          setBattleState({ run: stored.run });
          setLoading(false);
        }
        return;
      }
      if (!runId) {
        if (!cancelled) {
          setBattleState(null);
          setLoading(false);
        }
        return;
      }

      try {
        const response = await fetch(`/api/model-battle/history/${runId}`, { cache: "no-store" });
        const payload = (await response.json()) as { run?: ModelAnalysisRun };
        if (!cancelled) {
          setBattleState(payload.run ? { run: payload.run } : null);
        }
      } catch {
        if (!cancelled) setBattleState(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const run = battleState?.run ?? null;
  const outputs = useMemo(() => (run ? run.outputs.slice(0, 4) : []), [run]);
  const bestOutput = useMemo(
    () => (run ? [...run.outputs].sort((left, right) => right.evaluation.overall - left.evaluation.overall)[0] ?? null : null),
    [run]
  );
  const agreementScore = useMemo(() => calcAgreementScore(run?.summary.similarityMatrix ?? []), [run]);
  const disagreementScore = Math.max(0, 100 - agreementScore);
  const overallConfidence = useMemo(() => averageOf(outputs.map((output) => output.parsed.confidence * 100)), [outputs]);
  const hallucinationRisk = useMemo(() => averageOf(outputs.map((output) => output.hallucinationRisk)), [outputs]);
  const metricCards: MetricCard[] = [
    { label: "Agreement %", value: `${agreementScore}%`, tone: "accent" },
    { label: "Disagreement %", value: `${disagreementScore}%`, tone: "warn" },
    { label: "Overall confidence", value: `${Math.round(overallConfidence)}%` },
    { label: "Hallucination risk", value: `${Math.round(hallucinationRisk)}%`, tone: "warn" }
  ];

  const verdict = useMemo(() => buildVerdictSummary(run, bestOutput), [bestOutput, run]);
  const track = run?.track;

  return (
    <OrbitBackdrop contentClassName="px-4 py-6 md:px-6 lg:px-8">
      <main className="mx-auto flex min-h-dvh max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(5,17,11,.96),rgba(5,17,11,.72))] p-5 shadow-2xl shadow-emerald-950/20 md:p-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-emerald-100">
              <Radar size={14} />
              Results
            </div>
            <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">Results</h1>
            <p className="text-base leading-7 text-slate-300 md:text-lg">
              {run ? `Comparison completed across ${run.providerCount} AI models.` : "No completed battle is stored yet."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" className="h-11" onClick={() => router.push("/model-battle")}>
              Compare New Music
              <ArrowRight size={16} />
            </Button>
            <Button type="button" variant="ghost" className="h-11" onClick={() => router.push("/model-battle/history")}>
              View History
            </Button>
          </div>
        </header>

        {loading ? (
          <section className="grid gap-4 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <div className="h-8 w-40 animate-pulse rounded-full bg-white/10" />
            <div className="grid gap-4 xl:grid-cols-[1.4fr_.6fr]">
              <div className="space-y-4 rounded-[2rem] border border-white/10 bg-white/[0.03] p-4 md:p-6">
                <div className="h-[520px] animate-pulse rounded-[2rem] bg-white/5" />
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="h-20 animate-pulse rounded-2xl bg-white/5" />
                  <div className="h-20 animate-pulse rounded-2xl bg-white/5" />
                  <div className="h-20 animate-pulse rounded-2xl bg-white/5" />
                  <div className="h-20 animate-pulse rounded-2xl bg-white/5" />
                </div>
              </div>
              <div className="space-y-4">
                <div className="h-80 animate-pulse rounded-[2rem] border border-white/10 bg-white/[0.03]" />
                <div className="h-56 animate-pulse rounded-[2rem] border border-white/10 bg-white/[0.03]" />
              </div>
            </div>
          </section>
        ) : run ? (
          <>
            <section className="grid gap-4 xl:grid-cols-[1.4fr_.6fr]">
              <div className="space-y-4 rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 md:p-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Disagreement orbit</p>
                    <h2 className="mt-1 text-2xl font-semibold">Agreement, clustering, and winner visibility</h2>
                  </div>
                  <Legend />
                </div>
                <ModelBattleOrbit outputs={outputs} summary={run.summary} className="h-[520px]" />
                <div className="grid gap-3 md:grid-cols-4">
                  <WinnerBadge label="Most grounded" value={run.summary.mostGroundedModel} />
                  <WinnerBadge label="Best overall" value={run.summary.bestOverallAnswer} />
                  <WinnerBadge label="Most creative" value={run.summary.mostCreativeModel} />
                  <WinnerBadge label="Most cautious" value={run.summary.mostCautiousModel} />
                </div>
              </div>

              <aside className="space-y-4">
                <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">AI verdict</p>
                  <h2 className="mt-2 text-2xl font-semibold">Synthesized summary</h2>
                  <p className="mt-4 text-sm leading-7 text-slate-300">{verdict}</p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    {metricCards.map((metric) => (
                      <MetricPill key={metric.label} {...metric} />
                    ))}
                  </div>
                </div>

                <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Track snapshot</p>
                  <h2 className="mt-2 text-2xl font-semibold">Comparison context</h2>
                  {track ? (
                    <div className="mt-4 grid gap-4">
                      <TrackSnapshotCard run={run} />
                    </div>
                  ) : null}
                </div>
              </aside>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 md:p-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Model comparison</p>
                  <h2 className="mt-1 text-2xl font-semibold">Comparison columns</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">
                    Provider cards stay visible while you scroll, and the table keeps the first metric column anchored for fast scanning.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                  <Sparkles size={14} />
                  {outputs.length} / 4 models shown
                </div>
              </div>

              <div className="mt-5 overflow-hidden rounded-[1.75rem] border border-white/10">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1480px] border-separate border-spacing-0 text-left">
                    <thead>
                      <tr>
                        <th className="sticky left-0 top-0 z-30 w-[15rem] border-b border-r border-white/10 bg-[#06120c] px-4 py-4 text-xs uppercase tracking-[0.22em] text-slate-400">
                          Metric
                        </th>
                        {outputs.map((output) => (
                          <th key={output.providerKey} className="sticky top-0 z-20 border-b border-white/10 bg-[#06120c] px-3 py-3 align-top">
                            <ProviderCard output={output} />
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonRows.map((row, rowIndex) => (
                        <tr key={row.label} className={rowIndex % 2 === 0 ? "bg-white/[0.015]" : "bg-white/[0.03]"}>
                          <th className="sticky left-0 z-20 border-r border-white/10 bg-[#07140d] px-4 py-4 align-top text-sm font-medium text-slate-300">
                            {row.label}
                          </th>
                          {outputs.map((output) => (
                            <td key={output.providerKey} className="px-4 py-4 align-top text-sm leading-7 text-slate-200">
                              {row.render(output)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 md:p-6">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Raw responses</p>
                  <h2 className="mt-1 text-2xl font-semibold">Expandable model outputs</h2>
                </div>
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Collapsed by default</div>
              </div>

              <div className="mt-5 space-y-3">
                {outputs.map((output) => (
                  <details key={output.providerKey} className="group rounded-[1.5rem] border border-white/10 bg-[#07140d]">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4">
                      <div>
                        <div className="text-sm font-semibold text-white">{output.providerName}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">{output.model}</div>
                      </div>
                      <ChevronDown className="transition group-open:rotate-180" size={18} />
                    </summary>
                    <div className="border-t border-white/10 px-4 py-4">
                      <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap break-words text-sm leading-7 text-slate-200">
                        {output.rawText}
                      </pre>
                    </div>
                  </details>
                ))}
              </div>
            </section>

            <section className="grid gap-3 rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 md:grid-cols-3 md:p-6">
              <Button type="button" className="h-12" onClick={() => router.push("/model-battle")}>
                Compare New Music
                <ArrowRight size={16} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-12"
                onClick={() => router.push("/model-battle?reuse=1")}
              >
                Run Same Track Again
              </Button>
              <Button type="button" variant="ghost" className="h-12" onClick={() => router.push("/model-battle/history")}>
                View History
              </Button>
            </section>
          </>
        ) : (
          <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.22em] text-slate-400">
                <Music2 size={14} />
                No saved results
              </div>
              <h2 className="text-3xl font-semibold">Run a model battle first</h2>
              <p className="text-sm leading-7 text-slate-300">
                The Results page reads the latest completed battle from local storage. Start a comparison, then return here to review the orbit, verdict, and provider-by-provider breakdown.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => router.push("/model-battle")}>
                  <ArrowLeft size={16} />
                  Go to Model Battle Setup
                </Button>
                <Button type="button" variant="ghost" onClick={() => router.push("/model-battle/history")}>
                  View History
                </Button>
              </div>
            </div>
          </section>
        )}
      </main>
    </OrbitBackdrop>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-400">
      <LegendPill color="bg-emerald-300" label="Agreement" />
      <LegendPill color="bg-amber-300" label="Disagreement" />
      <LegendPill color="bg-sky-300" label="Confidence" />
      <LegendPill color="bg-white" label="Winner" />
    </div>
  );
}

function LegendPill({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] tracking-[0.18em] text-slate-300">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function MetricPill({ label, value, tone = "default" }: MetricCard) {
  const toneClass =
    tone === "accent"
      ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-50"
      : tone === "warn"
        ? "border-amber-300/20 bg-amber-300/10 text-amber-50"
        : "border-white/10 bg-white/[0.04] text-white";

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClass}`}>
      <div className="text-[11px] uppercase tracking-[0.18em] text-current/70">{label}</div>
      <div className="mt-2 text-xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function WinnerBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#07140d] px-4 py-4">
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="mt-2 text-sm font-medium text-white">{value}</div>
    </div>
  );
}

function TrackSnapshotCard({ run }: { run: ModelAnalysisRun }) {
  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#07140d]">
      <div className="grid gap-4 p-4 md:grid-cols-[140px_1fr]">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
          {run.track.albumArt ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={run.track.albumArt} alt={`${run.track.name} album art`} className="aspect-square h-full w-full object-cover" />
          ) : (
            <div className="flex aspect-square items-center justify-center bg-gradient-to-br from-emerald-300/25 to-slate-900 text-emerald-100">
              <Music2 size={28} />
            </div>
          )}
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Track</p>
            <h3 className="mt-1 text-2xl font-semibold text-white">{run.track.name}</h3>
            <p className="mt-1 text-sm text-slate-300">{run.track.artistName}</p>
          </div>
          <div className="grid gap-2 text-sm">
            <SnapshotRow label="Question" value={run.question} />
            <SnapshotRow label="Analysis mode" value={run.mode} />
            <SnapshotRow
              label="Providers used"
              value={
                <div className="flex flex-wrap justify-end gap-2">
                  {run.outputs.slice(0, 4).map((output) => (
                    <span key={output.providerKey} className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] uppercase tracking-[0.14em] text-slate-200">
                      {output.providerName}
                    </span>
                  ))}
                </div>
              }
            />
            <SnapshotRow label="Created time" value={new Date(run.createdAt).toLocaleString()} />
            <SnapshotRow
              label="Spotify link"
              value={
                run.track.spotifyUrl ? (
                  <a className="inline-flex items-center gap-1 text-emerald-100 hover:text-white" href={run.track.spotifyUrl} target="_blank" rel="noreferrer">
                    Open track
                    <ExternalLink size={14} />
                  </a>
                ) : (
                  "Not available"
                )
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function SnapshotRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
      <span className="text-slate-400">{label}</span>
      <span className="max-w-[65%] text-right text-white">{value}</span>
    </div>
  );
}

function ProviderCard({ output }: { output: ModelBattleOutput }) {
  return (
    <div className="min-w-[250px] rounded-[1.25rem] border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 shadow-sm shadow-emerald-950/20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">{output.providerName}</div>
          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-emerald-100">{output.model}</div>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-200">
          {Math.round(output.evaluation.overall)}%
        </span>
      </div>
      <div className="mt-3 text-xs text-slate-300">
        {output.latencyMs} ms • {output.estimatedTokens} est. tokens
      </div>
    </div>
  );
}

const comparisonRows = [
  {
    label: "Summary",
    render: (output: ModelBattleOutput) => <p className="leading-7 text-slate-100">{output.parsed.summary}</p>
  },
  {
    label: "Confidence",
    render: (output: ModelBattleOutput) => <strong className="text-lg text-emerald-100">{Math.round(output.parsed.confidence * 100)}%</strong>
  },
  {
    label: "Hallucination Risk",
    render: (output: ModelBattleOutput) => <span className="text-lg text-amber-100">{output.hallucinationRisk}%</span>
  },
  {
    label: "Latency",
    render: (output: ModelBattleOutput) => <span>{output.latencyMs} ms</span>
  },
  {
    label: "Emotional Tags",
    render: (output: ModelBattleOutput) => <TagList items={output.parsed.emotional_profile} />
  },
  {
    label: "Genre Tags",
    render: (output: ModelBattleOutput) => <TagList items={output.parsed.genre_hypothesis} />
  },
  {
    label: "Key Claims",
    render: (output: ModelBattleOutput) => <TagList items={output.parsed.evidence.map((entry) => entry.claim)} />
  },
  {
    label: "Limitations",
    render: (output: ModelBattleOutput) => <TagList items={output.parsed.limitations} />
  }
] as const;

function TagList({ items }: { items: string[] }) {
  if (!items.length) return <span className="text-slate-500">None</span>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.slice(0, 4).map((item) => (
        <span key={item} className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-slate-200">
          {item}
        </span>
      ))}
    </div>
  );
}

function buildVerdictSummary(run: ModelAnalysisRun | null, bestOutput: ModelBattleOutput | null) {
  if (!run || !bestOutput) {
    return "No completed analysis run is available yet.";
  }

  const agreement = run.summary.agreesOn.slice(0, 3).join(", ");
  const disagreement = run.summary.disagreesOn[0] ?? "a broad interpretation split";
  const lead = bestOutput.parsed.summary.trim();

  return [
    `${run.summary.bestOverallAnswer} produced the strongest overall answer, and the models broadly converge on ${agreement || "the core feel of the track"}.`,
    `The main disagreement centers on ${disagreement}.`,
    lead
  ]
    .filter(Boolean)
    .join(" ");
}

function calcAgreementScore(matrix: ModelAnalysisRun["summary"]["similarityMatrix"]) {
  if (!matrix.length) return 0;
  return Math.round(averageOf(matrix.map((entry) => entry.score)));
}

function averageOf(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
