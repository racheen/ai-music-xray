"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, type ReactNode, useEffect, useMemo, useState, useTransition } from "react";
import { BrainCircuit, Loader2, Radar, SlidersHorizontal, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { OrbitBackdrop } from "./OrbitBackdrop";
import { ModelBattleOrbit } from "./ModelBattleOrbit";
import { loadLastBattleInput, saveLastBattleState } from "@/lib/model-battle/storage";
import { analysisModes, type AnalysisMode, type ModelAnalysisRun, type ProviderAvailability, type ProviderKey } from "@/lib/model-battle/types";

type Props = {
  providers: ProviderAvailability[];
};

type ApiResponse = {
  run: ModelAnalysisRun;
  providers: ProviderAvailability[];
};

const MAX_COMPARE_MODELS = 4;

export function ModelBattleDashboard({ providers }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultProviders = providers
    .filter((provider) => provider.enabled)
    .map((provider) => provider.key)
    .slice(0, MAX_COMPARE_MODELS);

  const [trackUrl, setTrackUrl] = useState("demo-neon-orbit");
  const [comparisonTrackUrl, setComparisonTrackUrl] = useState("");
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>("why-do-i-like-this-song");
  const [question, setQuestion] = useState(defaultQuestion("why-do-i-like-this-song"));
  const [lyricsContext, setLyricsContext] = useState("");
  const [selectedProviders, setSelectedProviders] = useState<ProviderKey[]>(defaultProviders.length ? defaultProviders : ["local"]);
  const [result, setResult] = useState<ModelAnalysisRun | null>(null);
  const [loading, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setQuestion(defaultQuestion(analysisMode));
  }, [analysisMode]);

  useEffect(() => {
    if (searchParams.get("reuse") !== "1") return;
    const storedInput = loadLastBattleInput();
    if (!storedInput) return;
    setTrackUrl(storedInput.trackUrl ?? storedInput.trackId ?? "demo-neon-orbit");
    setComparisonTrackUrl(storedInput.comparisonTrackUrl ?? "");
    setAnalysisMode(storedInput.mode);
    setQuestion(storedInput.question);
    setLyricsContext(storedInput.lyricsContext ?? "");
    setSelectedProviders(storedInput.providerKeys.slice(0, MAX_COMPARE_MODELS));
  }, [searchParams]);

  const enabledProviders = useMemo(() => providers.filter((provider) => provider.enabled).slice(0, MAX_COMPARE_MODELS), [providers]);

  const selectedComparisonProviders = useMemo(() => {
    const ordered = selectedProviders
      .slice(0, MAX_COMPARE_MODELS)
      .map((key) => providers.find((provider) => provider.key === key))
      .filter((provider): provider is ProviderAvailability => Boolean(provider))
      .slice(0, MAX_COMPARE_MODELS);
    return ordered.length ? ordered : enabledProviders.slice(0, 1);
  }, [enabledProviders, providers, selectedProviders]);

  function toggleProvider(key: ProviderKey) {
    setSelectedProviders((current) => {
      if (current.includes(key)) return current.filter((item) => item !== key);
      if (current.length >= MAX_COMPARE_MODELS) return current;
      return [...current, key];
    });
  }

  function submitAnalysis(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const normalizedTrack = normalizeTrackInput(trackUrl);
        const response = await fetch("/api/model-battle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            trackUrl: normalizedTrack.trackUrl,
            trackId: normalizedTrack.trackId,
            comparisonTrackUrl: comparisonTrackUrl || null,
            question,
            mode: analysisMode,
            providerKeys: selectedProviders,
            lyricsContext: lyricsContext.trim() || null,
            useListeningProfile: true
          }),
          cache: "no-store"
        });
        const payload = (await response.json()) as ApiResponse & { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Model battle failed.");
        saveLastBattleState({
          run: payload.run,
          input: {
            trackUrl: normalizedTrack.trackUrl ?? normalizedTrack.trackId,
            trackId: normalizedTrack.trackId,
            comparisonTrackUrl: comparisonTrackUrl || null,
            question,
            mode: analysisMode,
            providerKeys: selectedProviders,
            lyricsContext: lyricsContext.trim() || null,
            useListeningProfile: true
          }
        });
        setResult(payload.run);
        router.push("/results");
      } catch (error) {
        setError(error instanceof Error ? error.message : "Unable to start model battle.");
      }
    });
  }

  async function loadCurrentlyPlayingTrack() {
    setError(null);
    try {
      const response = await fetch("/api/spotify/player", { cache: "no-store" });
      const payload = (await response.json()) as { track?: { id?: string; name?: string } | null; message?: string; error?: string; authenticated?: boolean };
      if (!response.ok || payload.authenticated === false) {
        throw new Error(payload.error ?? "Connect Spotify first, then start playback in Spotify.");
      }
      if (!payload.track?.id) {
        throw new Error(payload.message ?? "No active Spotify playback found yet.");
      }
      setTrackUrl(payload.track.id);
      if (payload.track.name) {
        setQuestion(`Analyze the currently playing track: ${payload.track.name}.`);
      }
      setAnalysisMode("why-do-i-like-this-song");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to load the currently playing track.");
    }
  }

  return (
    <OrbitBackdrop contentClassName="px-4 py-6 md:px-6 lg:px-8">
      <main className="mx-auto flex min-h-dvh max-w-7xl flex-col gap-6">
        <nav className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <Link href="/" className="font-semibold tracking-[0.24em] text-emerald-100">
            AI MUSIC X-RAY
          </Link>
          <div className="flex flex-wrap gap-2">
            <Link href="/app" className="inline-flex h-10 items-center justify-center rounded-md border border-white/10 bg-white/5 px-3 text-slate-200 hover:bg-white/10">
              Visualizer
            </Link>
            <Link href="/model-battle/history" className="inline-flex h-10 items-center justify-center rounded-md border border-white/10 bg-white/5 px-3 text-slate-200 hover:bg-white/10">
              Saved runs
            </Link>
          </div>
        </nav>

        <section className="grid gap-8 xl:grid-cols-[1.1fr_.9fr] xl:items-start">
          <div className="space-y-6 pt-4 md:pt-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-emerald-100">
              <BrainCircuit size={14} />
              AI Model Comparison
            </div>
            <h1 className="max-w-4xl text-5xl font-semibold leading-[0.95] tracking-tight md:text-7xl">
              Compare how AI models hear your music.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-300 md:text-xl">
              Run the same track through multiple AI models and see where they agree, diverge, hallucinate, or reveal new musical insight.
            </p>
            <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Mission control</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Maximum 4 models per battle</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Spotify + local fallback</span>
            </div>

            <form onSubmit={submitAnalysis} className="grid gap-4 rounded-[2rem] border border-white/10 bg-white/[0.05] p-4 shadow-2xl shadow-emerald-950/20 backdrop-blur md:p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Spotify track link or ID">
                  <input
                    value={trackUrl}
                    onChange={(event) => setTrackUrl(event.target.value)}
                    className="h-11 w-full rounded-xl border border-white/10 bg-[#07140d] px-4 text-sm text-white outline-none ring-0 placeholder:text-slate-500 focus:border-emerald-300/60"
                    placeholder="https://open.spotify.com/track/..."
                  />
                </Field>
                <Field label="Comparison track">
                  <input
                    value={comparisonTrackUrl}
                    onChange={(event) => setComparisonTrackUrl(event.target.value)}
                    className="h-11 w-full rounded-xl border border-white/10 bg-[#07140d] px-4 text-sm text-white outline-none ring-0 placeholder:text-slate-500 focus:border-emerald-300/60"
                    placeholder="Optional second song"
                  />
                </Field>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void loadCurrentlyPlayingTrack()}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-slate-200 hover:bg-white/10"
                >
                  <Sparkles size={16} />
                  Use currently playing track
                </button>
                <p className="self-center text-xs uppercase tracking-[0.18em] text-slate-500">
                  Requires an active Spotify session and something playing in Spotify
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
                <Field label="Analysis mode">
                  <select
                    value={analysisMode}
                    onChange={(event) => setAnalysisMode(event.target.value as AnalysisMode)}
                    className="h-11 w-full rounded-xl border border-white/10 bg-[#07140d] px-4 text-sm text-white outline-none focus:border-emerald-300/60"
                  >
                    {analysisModes.map((mode) => (
                      <option key={mode.id} value={mode.id}>
                        {mode.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Question">
                  <input
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    className="h-11 w-full rounded-xl border border-white/10 bg-[#07140d] px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-300/60"
                    placeholder="Why does this song feel uplifting?"
                  />
                </Field>
              </div>

              <Field label="Optional lyrics or context">
                <textarea
                  value={lyricsContext}
                  onChange={(event) => setLyricsContext(event.target.value)}
                  className="min-h-28 w-full rounded-2xl border border-white/10 bg-[#07140d] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-300/60"
                  placeholder="Paste lyrics, notes, or context that should be shared across all providers."
                />
              </Field>

              <div className="space-y-2">
                <div className="flex items-end justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Providers</p>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Compare up to {MAX_COMPARE_MODELS} models</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {providers.map((provider) => {
                    const selected = selectedProviders.includes(provider.key);
                    const selectionFull = selectedProviders.length >= MAX_COMPARE_MODELS;
                    const disabled = !selected && selectionFull;
                    return (
                      <button
                        key={provider.key}
                        type="button"
                        onClick={() => toggleProvider(provider.key)}
                        className={`rounded-2xl border px-4 py-3 text-left transition ${
                          selected
                            ? "border-emerald-300/50 bg-emerald-300/15 text-white shadow-[0_0_0_1px_rgba(134,239,172,0.2)]"
                            : disabled
                              ? "cursor-not-allowed border-white/8 bg-white/[0.02] text-slate-500"
                              : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-emerald-300/25 hover:bg-white/[0.06]"
                        }`}
                        disabled={disabled}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium">{provider.label}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[11px] uppercase tracking-[0.18em] ${provider.enabled ? "bg-emerald-300/15 text-emerald-100" : "bg-white/5 text-slate-400"}`}>
                            {provider.enabled ? "Enabled" : "Off"}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-slate-400">{provider.model}</p>
                      </button>
                    );
                  })}
                </div>
                {selectedProviders.length >= MAX_COMPARE_MODELS ? (
                  <p className="rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-50">
                    Maximum {MAX_COMPARE_MODELS} models per battle.
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={loading} className="h-11 px-5">
                  {loading ? <Loader2 className="animate-spin" size={16} /> : <Radar size={16} />}
                  Run model battle
                </Button>
                <Link
                  href="/model-battle/history"
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-slate-200 hover:bg-white/10"
                >
                  View history
                </Link>
              </div>
              {error ? <p className="rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</p> : null}
            </form>
          </div>

          <div className="space-y-4 pt-2 md:pt-10">
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-4 md:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Live board</p>
                  <h2 className="mt-1 text-xl font-semibold">Disagreement orbit</h2>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs text-emerald-100">
                  <SlidersHorizontal size={14} />
                  {result?.providerCount ?? selectedProviders.length} models
                </div>
              </div>
              <ModelBattleOrbit outputs={result?.outputs ?? []} summary={result?.summary ?? emptySummary()} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Metric label="Most grounded" value={result?.summary.mostGroundedModel ?? "Waiting"} />
              <Metric label="Best overall" value={result?.summary.bestOverallAnswer ?? "Waiting"} />
              <Metric label="Most creative" value={result?.summary.mostCreativeModel ?? "Waiting"} />
              <Metric label="Most cautious" value={result?.summary.mostCautiousModel ?? "Waiting"} />
            </div>
          </div>
        </section>

        {result ? (
          <>
            <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Comparison summary</p>
                <h2 className="mt-2 text-2xl font-semibold">{result.summary.bestOverallAnswer}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  {result.outputs.find((output) => output.providerName === result.summary.bestOverallAnswer)?.parsed.summary}
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <SummaryList title="Agreement" items={result.summary.agreesOn} />
                  <SummaryList title="Disagreement" items={result.summary.disagreesOn} />
                </div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Track snapshot</p>
                <h2 className="mt-2 text-2xl font-semibold">{result.track.name}</h2>
                <p className="text-sm text-slate-300">{result.track.artistName}</p>
                <div className="mt-4 grid gap-2 text-sm text-slate-300">
                  <MetaRow label="Mode" value={result.mode} />
                  <MetaRow label="Question" value={result.question} />
                  <MetaRow label="Provider count" value={String(result.providerCount)} />
                  <MetaRow label="Created" value={new Date(result.createdAt).toLocaleString()} />
                </div>
              </div>
            </section>

            <section className="space-y-4 rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 md:p-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Model battle</p>
                  <h2 className="mt-1 text-2xl font-semibold">Comparison columns</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">
                    Provider cards stay visible while you scroll, and the table keeps the first metric column anchored for fast scanning.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                  <Sparkles size={14} />
                  {selectedComparisonProviders.length} / 4 models shown
                </div>
              </div>

              <div className="overflow-hidden rounded-[1.75rem] border border-white/10">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1480px] border-separate border-spacing-0 text-left">
                    <thead>
                      <tr>
                        <th className="sticky left-0 top-0 z-30 w-[15rem] border-b border-r border-white/10 bg-[#06120c] px-4 py-4 text-xs uppercase tracking-[0.22em] text-slate-400">
                          Metric
                        </th>
                        {selectedComparisonProviders.map((provider) => {
                          const output = result.outputs.find((item) => item.providerKey === provider.key);
                          return (
                            <th key={provider.key} className="sticky top-0 z-20 border-b border-white/10 bg-[#06120c] px-3 py-3 align-top">
                              <div className="rounded-[1.25rem] border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 shadow-sm shadow-emerald-950/20">
                                <div className="text-sm font-semibold text-white">{provider.label}</div>
                                <div className="mt-1 text-xs uppercase tracking-[0.18em] text-emerald-100">{provider.model}</div>
                                <div className="mt-2 text-xs text-slate-300">
                                  {output ? `${output.latencyMs} ms • ${output.estimatedTokens} est. tokens` : "Waiting"}
                                </div>
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonRows.map((row, rowIndex) => (
                        <tr key={row.label} className={rowIndex % 2 === 0 ? "bg-white/[0.015]" : "bg-white/[0.03]"}>
                          <th className="sticky left-0 z-20 border-r border-white/10 bg-[#07140d] px-4 py-4 align-top text-sm font-medium text-slate-300">
                            {row.label}
                          </th>
                          {selectedComparisonProviders.map((provider) => {
                            const output = result.outputs.find((item) => item.providerKey === provider.key);
                            return (
                              <td key={provider.key} className="px-4 py-4 align-top text-sm leading-7 text-slate-200">
                                {output ? row.render(output) : <span className="text-slate-500">Waiting</span>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </>
        ) : null}
      </main>
    </OrbitBackdrop>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="text-xs uppercase tracking-[0.22em] text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-sm shadow-black/20 transition-transform duration-300 hover:-translate-y-0.5 hover:border-emerald-300/20">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 break-words text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function SummaryList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{title}</p>
      <ul className="mt-3 space-y-2 text-sm text-slate-200">
        {items.length ? items.map((item) => <li key={item}>• {item}</li>) : <li className="text-slate-500">No items yet.</li>}
      </ul>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-[#07140d] px-3 py-2">
      <span className="text-slate-400">{label}</span>
      <span className="max-w-[60%] text-right text-white">{value}</span>
    </div>
  );
}

function defaultQuestion(mode: AnalysisMode) {
  const questions: Record<AnalysisMode, string> = {
    "why-do-i-like-this-song": "Why do I like this song?",
    "song-personality-profile": "What personality does this song project?",
    "genre-and-influence-analysis": "What genres and influences does this song suggest?",
    "commercial-virality-potential": "How viral or commercially viable is this track?",
    "emotional-arc-analysis": "What emotional arc does this song follow?",
    "production-and-sound-design-analysis": "What does the production and sound design say here?",
    "compare-two-songs": "How does this song compare to the other track?",
    "casual-listener-explanation": "Explain this song like I’m a casual listener.",
    "producer-explanation": "Explain this song like I’m a music producer."
  };
  return questions[mode];
}

function normalizeTrackInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return { trackUrl: null, trackId: null };
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("spotify:track:")) {
    return { trackUrl: trimmed, trackId: null };
  }
  return { trackUrl: null, trackId: trimmed };
}

const comparisonRows = [
  {
    label: "Summary",
    render: (output: ModelAnalysisRun["outputs"][number]) => <p className="leading-7 text-slate-100">{output.parsed.summary}</p>
  },
  {
    label: "Confidence",
    render: (output: ModelAnalysisRun["outputs"][number]) => <strong className="text-lg text-emerald-100">{Math.round(output.parsed.confidence * 100)}%</strong>
  },
  {
    label: "Hallucination risk",
    render: (output: ModelAnalysisRun["outputs"][number]) => <span className="text-lg text-amber-100">{output.hallucinationRisk}%</span>
  },
  {
    label: "Latency",
    render: (output: ModelAnalysisRun["outputs"][number]) => <span>{output.latencyMs} ms</span>
  },
  {
    label: "Emotional tags",
    render: (output: ModelAnalysisRun["outputs"][number]) => <TagList items={output.parsed.emotional_profile} />
  },
  {
    label: "Genre tags",
    render: (output: ModelAnalysisRun["outputs"][number]) => <TagList items={output.parsed.genre_hypothesis} />
  },
  {
    label: "Key claims",
    render: (output: ModelAnalysisRun["outputs"][number]) => <TagList items={output.parsed.evidence.map((entry) => entry.claim)} />
  },
  {
    label: "Limitations",
    render: (output: ModelAnalysisRun["outputs"][number]) => <TagList items={output.parsed.limitations} />
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

function emptySummary() {
  return {
    agreesOn: [],
    disagreesOn: [],
    mostCreativeModel: "Waiting",
    mostGroundedModel: "Waiting",
    mostCautiousModel: "Waiting",
    bestOverallAnswer: "Waiting",
    similarityMatrix: []
  };
}
