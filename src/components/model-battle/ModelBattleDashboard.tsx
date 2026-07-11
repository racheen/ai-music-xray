"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, type ReactNode, useEffect, useState, useTransition } from "react";
import { BrainCircuit, Loader2, Radar, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { BattleActionLink, BattlePanel, BattleSectionLabel, BattleShell } from "./BattleShell";
import { OrbitBackdrop } from "./OrbitBackdrop";
import { loadLastBattleInput, savePendingBattleInput } from "@/lib/model-battle/storage";
import { analysisModes, type AnalysisMode, type ProviderAvailability, type ProviderKey } from "@/lib/model-battle/types";

type Props = {
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
        const nextInput = {
          trackUrl: normalizedTrack.trackUrl ?? normalizedTrack.trackId,
          trackId: normalizedTrack.trackId,
          comparisonTrackUrl: comparisonTrackUrl || null,
          question,
          mode: analysisMode,
          providerKeys: selectedProviders,
          lyricsContext: lyricsContext.trim() || null,
          useListeningProfile: true
        };
        const draftRunId = globalThis.crypto?.randomUUID?.() ?? `draft-${Date.now()}`;
        savePendingBattleInput(draftRunId, nextInput);
        router.push(`/model-battle/running/${draftRunId}`);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Unable to start model battle.");
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
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to load the currently playing track.");
    }
  }

  return (
    <OrbitBackdrop contentClassName="pb-10">
      <BattleShell
        currentRoute="model-battle"
        routeLabel="1. Model Battle Setup"
        routePath="/model-battle"
        action={<BattleActionLink href="/model-battle/history">View history</BattleActionLink>}
      >
        <section className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
          <BattlePanel className="overflow-hidden">
            <div className="flex h-full flex-col justify-between gap-8 p-6 md:p-7">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-emerald-100">
                  <BrainCircuit size={14} />
                  Compare AI Perspectives
                </div>
                <div className="space-y-4">
                  <h1 className="max-w-md text-4xl font-semibold leading-[0.98] tracking-tight md:text-6xl">
                    Compare how AI models hear <span className="text-emerald-300">your music.</span>
                  </h1>
                  <p className="max-w-md text-sm leading-7 text-slate-300 md:text-base">
                    Run the same track through multiple AI models and see where they agree, diverge, hallucinate, or reveal new musical insight.
                  </p>
                </div>
              </div>

              <div className="relative flex min-h-[18rem] items-center justify-center overflow-hidden rounded-[1.7rem] border border-white/8 bg-[radial-gradient(circle_at_30%_35%,rgba(134,239,172,.24),transparent_20%),linear-gradient(180deg,rgba(3,10,6,.88),rgba(7,20,13,.65))]">
                <div className="absolute left-[-7rem] top-[1.5rem] h-48 w-48 rounded-full border border-emerald-300/20 bg-emerald-200/10 blur-sm" />
                <div className="absolute inset-0 opacity-60 [background-image:radial-gradient(circle,rgba(167,243,208,.65)_1px,transparent_1px)] [background-size:42px_42px]" />
                <div className="absolute h-56 w-56 rounded-full border border-emerald-300/25" />
                <div className="absolute h-72 w-72 rounded-full border border-emerald-300/12" />
                <div className="absolute h-80 w-80 rounded-full border border-emerald-300/8" />
                <div className="absolute right-[18%] top-[24%] h-4 w-4 rounded-full bg-emerald-300 shadow-[0_0_26px_rgba(74,222,128,0.9)]" />
                <div className="absolute left-[23%] top-[58%] h-2.5 w-2.5 rounded-full bg-emerald-200 shadow-[0_0_20px_rgba(167,243,208,0.7)]" />
              </div>

              <div className="grid gap-3 text-center text-xs uppercase tracking-[0.18em] text-slate-400 sm:grid-cols-3">
                <OrbitalFeature title="Multi-model" description="comparison" />
                <OrbitalFeature title="Agreement" description="and disagreement" />
                <OrbitalFeature title="Hallucination" description="risk detection" />
              </div>
            </div>
          </BattlePanel>

          <BattlePanel className="p-5 md:p-7">
            <div className="mb-5">
              <BattleSectionLabel
                label="Start a New Model Battle"
                title="Load a track, choose the mode, and launch the comparison."
                description="Use a Spotify link or live playback, then compare up to four enabled providers with one shared prompt."
              />
            </div>

            <form onSubmit={submitAnalysis} className="grid gap-5">
              <Field label="Spotify track link or ID">
                <input
                  value={trackUrl}
                  onChange={(event) => setTrackUrl(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-white/10 bg-[#07140d] px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-300/60"
                  placeholder="https://open.spotify.com/track/..."
                />
              </Field>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void loadCurrentlyPlayingTrack()}
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 text-sm text-slate-100 hover:bg-white/10"
                >
                  <Sparkles size={15} />
                  Use currently playing track
                </button>
                <p className="text-xs text-slate-500">Requires an active Spotify session and something currently playing.</p>
              </div>

              <Field label="Analysis mode">
                <select
                  value={analysisMode}
                  onChange={(event) => setAnalysisMode(event.target.value as AnalysisMode)}
                  className="h-12 w-full rounded-2xl border border-white/10 bg-[#07140d] px-4 text-sm text-white outline-none focus:border-emerald-300/60"
                >
                  {analysisModes.map((mode) => (
                    <option key={mode.id} value={mode.id}>
                      {mode.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Your question">
                <input
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-white/10 bg-[#07140d] px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-300/60"
                  placeholder="What emotional arc does this song follow?"
                />
              </Field>

              <Field label="Optional lyrics or context">
                <textarea
                  value={lyricsContext}
                  onChange={(event) => setLyricsContext(event.target.value)}
                  className="min-h-28 w-full rounded-[1.5rem] border border-white/10 bg-[#07140d] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-300/60"
                  placeholder="Paste lyrics, notes, or any context to share across all models."
                />
              </Field>

              <div className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
                <div className="space-y-3">
                  <div className="flex items-end justify-between gap-3">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Select models to compare</p>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Up to {MAX_COMPARE_MODELS}</p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {providers.map((provider) => {
                      const selected = selectedProviders.includes(provider.key);
                      const selectionFull = selectedProviders.length >= MAX_COMPARE_MODELS;
                      const disabled = !selected && selectionFull;
                      return (
                        <button
                          key={provider.key}
                          type="button"
                          onClick={() => toggleProvider(provider.key)}
                          className={clsxProvider(selected, disabled)}
                          disabled={disabled}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-medium text-white">{provider.label}</div>
                              <p className="mt-1 text-xs text-slate-400">{provider.model}</p>
                            </div>
                            <span className={selected ? providerEnabledClass : providerDisabledClass}>{provider.enabled ? "Ready" : "Off"}</span>
                          </div>
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

                <div className="rounded-[1.7rem] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Comparison track</p>
                  <input
                    value={comparisonTrackUrl}
                    onChange={(event) => setComparisonTrackUrl(event.target.value)}
                    className="mt-3 h-11 w-full rounded-2xl border border-white/10 bg-[#07140d] px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-300/60"
                    placeholder="Optional second song"
                  />
                  <div className="mt-4 space-y-3">
                    <StatusPill label="Selected models" value={String(selectedProviders.length)} />
                    <StatusPill label="Analysis mode" value={analysisModes.find((mode) => mode.id === analysisMode)?.label ?? analysisMode} />
                    <StatusPill label="Output route" value="/results" />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Button type="submit" disabled={loading} className="h-11 px-5">
                  {loading ? <Loader2 className="animate-spin" size={16} /> : <Radar size={16} />}
                  Run model battle
                </Button>
                <Link
                  href="/model-battle/history"
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 text-sm text-slate-100 hover:bg-white/10"
                >
                  View history
                </Link>
              </div>
              {error ? <p className="rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</p> : null}
            </form>
          </BattlePanel>
        </section>

        
      </BattleShell>
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

function OrbitalFeature({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[1.3rem] border border-white/10 bg-white/[0.03] px-4 py-3">
      <div className="font-medium text-emerald-50">{title}</div>
      <div className="mt-1 text-[11px] text-slate-500">{description}</div>
    </div>
  );
}
function StatusPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#07140d] px-3 py-2">
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-1 text-sm text-white">{value}</div>
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

function clsxProvider(selected: boolean, disabled: boolean) {
  if (selected) {
    return "rounded-[1.4rem] border border-emerald-300/40 bg-emerald-300/12 px-4 py-3 text-left shadow-[0_0_0_1px_rgba(134,239,172,0.12)] transition";
  }
  if (disabled) {
    return "cursor-not-allowed rounded-[1.4rem] border border-white/8 bg-white/[0.02] px-4 py-3 text-left text-slate-500 transition";
  }
  return "rounded-[1.4rem] border border-white/10 bg-white/[0.03] px-4 py-3 text-left transition hover:border-emerald-300/25 hover:bg-white/[0.06]";
}

const providerEnabledClass = "rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-emerald-100";
const providerDisabledClass = "rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-400";
