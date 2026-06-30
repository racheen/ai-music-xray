import { Activity, AudioLines, BrainCircuit, Database, Sparkles } from "lucide-react";
import { SpotifyAuthAction } from "@/components/spotify/SpotifyAuthAction";

const features = [
  { label: "Beat-reactive scenes", Icon: Activity },
  { label: "Spotify Playback SDK", Icon: AudioLines },
  { label: "Model-ready analysis API", Icon: BrainCircuit },
  { label: "Demo mode included", Icon: Sparkles }
];

export default function HomePage() {
  return (
    <main className="min-h-dvh bg-[#04110a] text-white">
      <section className="relative flex min-h-dvh items-center overflow-hidden px-5 py-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_20%,rgba(134,239,172,.22),transparent_34%),radial-gradient(circle_at_78%_30%,rgba(34,197,94,.16),transparent_30%),linear-gradient(135deg,#04110a,#0d1710_45%,#050805)]" />
        <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#04110a] to-transparent" />
        <div className="relative mx-auto grid w-full max-w-6xl gap-12 lg:grid-cols-[1fr_.8fr] lg:items-center">
          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.28em] text-emerald-200">Spotify visual intelligence</p>
            <h1 className="max-w-4xl text-5xl font-semibold leading-tight md:text-7xl">AI Music X-Ray</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
              Connect Spotify, play a track, and watch a real-time generative scan of tempo, beats, sections, and simulated stems.
              It runs immediately in demo mode and is structured for heavier open-source analysis services later.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="/app" className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-300 px-4 text-sm font-medium text-slate-950 hover:bg-emerald-200">
                Launch visualizer
              </a>
              <SpotifyAuthAction
                connectedLabel="Disconnect Spotify"
                disconnectedLabel="Connect Spotify"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/12 bg-white/6 px-4 text-sm font-medium text-white hover:bg-white/10"
              />
              <a href="/spotify-history" className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/12 bg-white/6 px-4 text-sm font-medium text-white hover:bg-white/10">
                <Database size={16} />
                View history JSON
              </a>
            </div>
          </div>
          <div className="grid gap-3">
            {features.map(({ label, Icon }) => (
              <div key={label} className="rounded-lg border border-white/10 bg-white/[0.07] p-5 backdrop-blur">
                <Icon className="mb-4 h-6 w-6 text-emerald-200" />
                <p className="font-medium">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
