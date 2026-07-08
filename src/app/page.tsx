import Link from "next/link";
import { Activity, AudioLines, BrainCircuit, Database, Sparkles } from "lucide-react";
import { SpotifyAuthAction } from "@/components/spotify/SpotifyAuthAction";
import { OrbitBackdrop } from "@/components/model-battle/OrbitBackdrop";

const features = [
  { label: "Beat-reactive scenes", Icon: Activity },
  { label: "Spotify playback + history", Icon: AudioLines },
  { label: "Multi-model comparison", Icon: BrainCircuit },
  { label: "Demo mode included", Icon: Sparkles }
];

export default function HomePage() {
  return (
    <OrbitBackdrop contentClassName="px-5 py-8 md:px-8 lg:px-10">
      <main className="mx-auto min-h-dvh max-w-7xl">
        <section className="grid min-h-[calc(100dvh-4rem)] items-center gap-10 py-8 lg:grid-cols-[1.05fr_.95fr]">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs uppercase tracking-[0.26em] text-emerald-100">
              Spotify visual intelligence
            </div>
            <h1 className="max-w-4xl text-5xl font-semibold leading-[0.95] tracking-tight md:text-7xl">
              AI Music X-Ray
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-300 md:text-xl">
              Spotify Wrapped meets AI model evaluation, inside a quiet orbit-space dashboard.
            </p>
            <p className="max-w-2xl text-base leading-7 text-slate-400 md:text-lg">
              Compare how AI models hear your music, then inspect where they agree, where they diverge, and where the answers start to feel
              imaginative instead of grounded.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/model-battle" className="inline-flex h-11 items-center justify-center rounded-md bg-emerald-300 px-4 text-sm font-medium text-slate-950 hover:bg-emerald-200">
                Run model battle
              </Link>
              <Link href="/results" className="inline-flex h-11 items-center justify-center rounded-md border border-white/12 bg-white/6 px-4 text-sm font-medium text-white hover:bg-white/10">
                View results
              </Link>
              <SpotifyAuthAction
                connectedLabel="Disconnect Spotify"
                disconnectedLabel="Connect Spotify"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-white/12 bg-white/6 px-4 text-sm font-medium text-white hover:bg-white/10"
              />
              <Link href="/model-battle/history" className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-white/12 bg-white/6 px-4 text-sm font-medium text-white hover:bg-white/10">
                <Database size={16} />
                View history
              </Link>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-5 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Analysis cockpit</p>
              <p className="mt-3 max-w-md text-lg leading-8 text-slate-200">
                A technical music-analysis cockpit with a calm, editorial feel and luminous green orbit cues.
              </p>
            </div>
            {features.map(({ label, Icon }) => (
              <div key={label} className="rounded-[1.5rem] border border-white/10 bg-white/[0.05] p-5 backdrop-blur transition-transform duration-300 hover:-translate-y-0.5">
                <Icon className="mb-4 h-6 w-6 text-emerald-200" />
                <p className="font-medium">{label}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </OrbitBackdrop>
  );
}
