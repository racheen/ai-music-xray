"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Music2 } from "lucide-react";
import { BattleActionLink, BattlePanel, BattleSectionLabel, BattleShell } from "./BattleShell";
import { OrbitBackdrop } from "./OrbitBackdrop";
import { ModelBattleOrbit } from "./ModelBattleOrbit";
import { usePlayback } from "@/components/playback/PlaybackProvider";
import { demoTrack } from "@/components/spotify/demoTrack";
import { Button } from "@/components/ui/Button";
import {
  clearPendingBattleInput,
  loadPendingBattleInput,
  saveLastBattleState,
  type StoredModelBattleInput
} from "@/lib/model-battle/storage";
import type { ModelAnalysisRun } from "@/lib/model-battle/types";

type ApiResponse = {
  run: ModelAnalysisRun;
  error?: string;
};

type PhaseStatus = "idle" | "queued" | "working";

const providerLabels: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Claude",
  gemini: "Gemini",
  mistral: "Mistral",
  ollama: "Ollama",
  local: "Local"
};

export function ModelBattleRunning() {
  const params = useParams<{ runId: string }>();
  const router = useRouter();
  const playback = usePlayback();
  const runId = typeof params?.runId === "string" ? params.runId : "";
  const [input, setInput] = useState<StoredModelBattleInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    setInput(loadPendingBattleInput(runId));
  }, [runId]);

  useEffect(() => {
    if (!input) return;
    const currentInput = input;
    let cancelled = false;
    const startedAt = performance.now();
    const tick = window.setInterval(() => setElapsedMs(performance.now() - startedAt), 300);

    async function startRun() {
      try {
        const response = await fetch("/api/model-battle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            trackUrl: currentInput.trackUrl,
            trackId: currentInput.trackId,
            comparisonTrackUrl: currentInput.comparisonTrackUrl,
            question: currentInput.question,
            mode: currentInput.mode,
            providerKeys: currentInput.providerKeys,
            lyricsContext: currentInput.lyricsContext,
            useListeningProfile: currentInput.useListeningProfile
          }),
          cache: "no-store"
        });
        const payload = (await response.json()) as ApiResponse;
        if (!response.ok || !payload.run) throw new Error(payload.error ?? "Model battle failed.");
        if (cancelled) return;
        saveLastBattleState({ run: payload.run, input: currentInput });
        clearPendingBattleInput();
        setRedirecting(true);
        router.replace(`/model-battle/results/${payload.run.id}`);
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "Unable to run model battle.");
        }
      } finally {
        window.clearInterval(tick);
      }
    }

    void startRun();
    return () => {
      cancelled = true;
      window.clearInterval(tick);
    };
  }, [input, router]);

  const phases = useMemo(
    () =>
      (input?.providerKeys ?? []).map((key, index) => {
        const elapsedStep = elapsedMs / 1400;
        const status: PhaseStatus = elapsedStep > index + 0.65 ? "working" : elapsedStep > index * 0.35 ? "queued" : "idle";
        return {
          key,
          label: providerLabels[key] ?? key,
          status
        };
      }),
    [elapsedMs, input?.providerKeys]
  );
  const trackDisplay = useMemo(() => buildRunningTrackDisplay(input, playback.activeTrack), [input, playback.activeTrack]);

  return (
    <OrbitBackdrop contentClassName="pb-10">
      <BattleShell
        currentRoute="model-battle"
        routeLabel="2. Running / Live Processing"
        routePath={runId ? `/model-battle/running/${runId}` : "/model-battle/running"}
        action={<BattleActionLink href="/model-battle/history">View history</BattleActionLink>}
      >
        {trackDisplay ? (
          <BattlePanel className="p-5 md:p-6">
            <div className="grid gap-4 md:grid-cols-[120px_1fr_auto_auto_auto] md:items-center">
              <div className="overflow-hidden rounded-[1.2rem] border border-white/10 bg-black/20">
                {trackDisplay.albumArt ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={trackDisplay.albumArt} alt={`${trackDisplay.name} album art`} className="aspect-square h-full w-full object-cover" />
                ) : (
                  <div className="flex aspect-square items-center justify-center bg-gradient-to-br from-emerald-300/25 to-slate-900 text-emerald-100">
                    <Music2 size={28} />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-2xl font-semibold text-white md:text-3xl">{trackDisplay.name}</h2>
                  <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-300">
                    Track
                  </span>
                </div>
                <p className="mt-1 truncate text-sm text-slate-300 md:text-base">
                  {trackDisplay.artist} {trackDisplay.album ? `· ${trackDisplay.album}` : ""}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <HeaderTag>{friendlyMode(input?.mode)}</HeaderTag>
                  <HeaderTag>{input?.question ?? "Preparing analysis..."}</HeaderTag>
                </div>
              </div>
              <RunMeta label="Run ID" value={runId.slice(0, 8) || "Pending"} />
              <RunMeta label="Created" value={new Date().toLocaleString()} />
              <RunMeta label="Models" value={String(input?.providerKeys.length ?? 0)} />
            </div>
          </BattlePanel>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[1.45fr_.55fr]">
          <BattlePanel className="overflow-hidden p-0">
            <div className="flex h-full min-h-[48rem] flex-col">
              <div className="px-6 pt-6">
                <div className="mx-auto max-w-3xl text-center">
                  <BattleSectionLabel
                    label="Processing"
                    title="Running the same track through selected AI models."
                    description="This may take a few moments while each provider produces, scores, and compares its interpretation."
                  />
                </div>
              </div>
              <div className="flex-1 px-4 pb-4 pt-4 md:px-6 md:pb-6">
                <ModelBattleOrbit outputs={[]} summary={emptySummary()} className="h-full min-h-[38rem]" />
              </div>
              <div className="pb-6 text-center text-xs uppercase tracking-[0.2em] text-slate-500">
                Run ID · {runId || "pending"}
              </div>
            </div>
          </BattlePanel>

          <div className="grid gap-4">
            <BattlePanel className="p-5">
              <BattleSectionLabel
                label="Provider Status"
                title="Live queue"
                description={input ? `${input.providerKeys.length} models selected.` : "Waiting for run configuration."}
              />
              <div className="mt-5 grid gap-3">
                {phases.length ? (
                  phases.map((phase) => (
                    <div key={phase.key} className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-medium text-white">{phase.label}</div>
                          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{statusLabel(phase.status)}</div>
                        </div>
                        <StatusDot status={phase.status} />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
                    Waiting for a pending model battle input.
                  </div>
                )}
              </div>
            </BattlePanel>

            {error ? (
              <BattlePanel className="p-5">
                <p className="rounded-[1.4rem] border border-rose-300/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</p>
                <div className="mt-4 flex gap-3">
                  <Button type="button" onClick={() => router.push("/model-battle")}>
                    Return to setup
                  </Button>
                </div>
              </BattlePanel>
            ) : (
              <BattlePanel className="p-5">
                <div className="flex items-center gap-3 text-sm text-slate-300">
                  <Loader2 className="animate-spin text-emerald-200" size={18} />
                  {redirecting ? "Opening results..." : "Running provider comparisons..."}
                </div>
              </BattlePanel>
            )}
          </div>
        </section>
      </BattleShell>
    </OrbitBackdrop>
  );
}

function StatusDot({ status }: { status: PhaseStatus }) {
  const className =
    status === "working"
      ? "bg-amber-300 shadow-[0_0_18px_rgba(252,211,77,0.55)]"
      : status === "queued"
        ? "bg-sky-300 shadow-[0_0_18px_rgba(125,211,252,0.5)]"
        : "bg-slate-600";
  return <span className={`inline-flex h-3 w-3 rounded-full ${className}`} />;
}

function statusLabel(status: PhaseStatus) {
  switch (status) {
    case "idle":
      return "Idle";
    case "queued":
      return "Queued";
    case "working":
      return "Running";
  }
}

function emptySummary(): ModelAnalysisRun["summary"] {
  return {
    agreesOn: [],
    disagreesOn: [],
    mostCreativeModel: "Pending",
    mostGroundedModel: "Pending",
    mostCautiousModel: "Pending",
    bestOverallAnswer: "Pending",
    similarityMatrix: []
  };
}

function buildRunningTrackDisplay(input: StoredModelBattleInput | null, activeTrack: { id: string; name: string; artist: string; albumArt?: string } | null) {
  if (!input) return null;
  const target = input.trackId ?? input.trackUrl ?? "Unknown track";
  if (target === demoTrack.id) {
    return {
      name: demoTrack.name,
      artist: demoTrack.artist,
      album: "Demo Session",
      albumArt: demoTrack.albumArt
    };
  }
  if (activeTrack && matchesTrackInput(input, activeTrack.id)) {
    return {
      name: activeTrack.name,
      artist: activeTrack.artist,
      album: "Spotify Playback",
      albumArt: activeTrack.albumArt
    };
  }
  return {
    name: simplifyTrackTarget(target),
    artist: input.trackId ? "Spotify track queued" : "Preparing track details",
    album: "",
    albumArt: null
  };
}

function matchesTrackInput(input: StoredModelBattleInput, trackId: string) {
  if (input.trackId && input.trackId === trackId) return true;
  return Boolean(input.trackUrl && input.trackUrl.includes(trackId));
}

function simplifyTrackTarget(value: string) {
  if (value.startsWith("https://open.spotify.com/track/")) {
    return value.replace("https://open.spotify.com/track/", "").split("?")[0];
  }
  if (value.startsWith("spotify:track:")) {
    return value.replace("spotify:track:", "");
  }
  return value;
}

function HeaderTag({ children }: { children: string }) {
  return <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-200">{children}</span>;
}

function RunMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.1rem] border border-white/10 bg-white/[0.03] px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-medium text-white">{value}</div>
    </div>
  );
}

function friendlyMode(mode?: StoredModelBattleInput["mode"]) {
  if (!mode) return "Loading";
  return mode
    .split("-")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}
