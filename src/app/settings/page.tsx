import { CheckCircle2, CircleAlert } from "lucide-react";
import { BattleActionLink, BattlePanel, BattleSectionLabel, BattleShell } from "@/components/model-battle/BattleShell";
import { OrbitBackdrop } from "@/components/model-battle/OrbitBackdrop";

const envRows = [
  ["SPOTIFY_CLIENT_ID", process.env.SPOTIFY_CLIENT_ID],
  ["SPOTIFY_CLIENT_SECRET", process.env.SPOTIFY_CLIENT_SECRET],
  ["NEXT_PUBLIC_APP_URL", process.env.NEXT_PUBLIC_APP_URL],
  ["SPOTIFY_REDIRECT_URI", process.env.SPOTIFY_REDIRECT_URI],
  ["DATABASE_URL", process.env.DATABASE_URL],
  ["AUDIO_ANALYSIS_API_URL", process.env.AUDIO_ANALYSIS_API_URL],
  ["OPENAI_API_KEY", process.env.OPENAI_API_KEY],
  ["ANTHROPIC_API_KEY", process.env.ANTHROPIC_API_KEY],
  ["GEMINI_API_KEY", process.env.GEMINI_API_KEY],
  ["MISTRAL_API_KEY", process.env.MISTRAL_API_KEY],
  ["OLLAMA_BASE_URL", process.env.OLLAMA_BASE_URL]
];

export default function SettingsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return <SettingsContent searchParams={searchParams} />;
}

async function SettingsContent({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const configuredCount = envRows.filter(([, value]) => Boolean(value)).length;

  return (
    <OrbitBackdrop contentClassName="pb-10">
      <BattleShell
        currentRoute="settings"
        routeLabel="6. Settings"
        routePath="/settings"
        action={<BattleActionLink href="/visualizer">Open visualizer</BattleActionLink>}
      >
        <BattlePanel className="p-5 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <BattleSectionLabel
              label="Environment Readiness"
              title="Provider, Spotify, and analysis-service status."
              description="This page reflects deployment readiness for the multi-model flow and the Spotify-connected visualizer."
            />
            <div className="grid min-w-[14rem] gap-3 sm:grid-cols-2">
              <ReadinessCard label="Configured variables" value={`${configuredCount}/${envRows.length}`} />
              <ReadinessCard label="Primary proxy" value="/api/analyze-track" />
            </div>
          </div>
          {params.error ? (
            <div className="mt-5 rounded-[1.5rem] border border-amber-300/25 bg-amber-300/10 p-4 text-sm text-amber-100">
              {params.error}
            </div>
          ) : null}
        </BattlePanel>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
          <BattlePanel className="p-5 md:p-6">
            <BattleSectionLabel
              label="API Providers"
              title="Connection matrix"
              description="Keys are detected server-side only. Missing values keep the corresponding providers disabled in the battle flow."
            />
            <div className="mt-5 grid gap-3">
              {envRows.map(([key, value]) => (
                <div key={key} className="flex items-center justify-between rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-4">
                  <div>
                    <p className="font-mono text-sm text-slate-200">{key}</p>
                    <p className="mt-1 text-sm text-slate-400">{value ? "Configured" : "Missing"}</p>
                  </div>
                  {value ? <CheckCircle2 className="text-emerald-300" /> : <CircleAlert className="text-amber-300" />}
                </div>
              ))}
            </div>
          </BattlePanel>

          <div className="grid gap-6">
            <BattlePanel className="p-5 md:p-6">
              <BattleSectionLabel
                label="Spotify Connection"
                title="Authentication notes"
                description="Spotify login powers live playback lookup, current-track bootstrapping, and user-specific playback metadata."
              />
              <div className="mt-5 grid gap-3">
                <InfoRow label="Login route" value="/api/spotify/login" />
                <InfoRow label="Callback route" value="/api/spotify/callback" />
                <InfoRow label="Session check" value="/api/spotify/session" />
                <InfoRow label="Live player" value="/api/spotify/player" />
              </div>
            </BattlePanel>

            <BattlePanel className="p-5 md:p-6">
              <BattleSectionLabel
                label="Analysis Service"
                title="Proxy and fallback behavior"
                description="The app uses generated beats and simulated stems unless you connect a separate Python service and point the proxy to it with AUDIO_ANALYSIS_API_URL."
              />
              <div className="mt-5 grid gap-3">
                <InfoRow label="Browser-facing endpoint" value="/api/analyze-track" />
                <InfoRow label="Service env var" value="AUDIO_ANALYSIS_API_URL" />
                <InfoRow label="Model battle keys" value="OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, MISTRAL_API_KEY, OLLAMA_BASE_URL" />
              </div>
            </BattlePanel>
          </div>
        </section>
      </BattleShell>
    </OrbitBackdrop>
  );
}

function ReadinessCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-2 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.35rem] border border-white/10 bg-[#07140d] px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-2 break-words font-mono text-sm text-emerald-100">{value}</div>
    </div>
  );
}
