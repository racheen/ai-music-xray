import { Activity, AudioLines, BrainCircuit, Sparkles } from "lucide-react";

const features = [
  { label: "Beat-reactive scenes", Icon: Activity },
  { label: "Spotify Playback SDK", Icon: AudioLines },
  { label: "Model-ready analysis API", Icon: BrainCircuit },
  { label: "Demo mode included", Icon: Sparkles }
];

export default function HomePage() {
  return (
    <main className="min-h-dvh bg-slate-950 text-white">
      <section className="relative flex min-h-dvh items-center overflow-hidden px-5 py-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(103,232,249,.24),transparent_34%),radial-gradient(circle_at_80%_32%,rgba(240,171,252,.2),transparent_32%),linear-gradient(135deg,#020617,#111827_45%,#09090b)]" />
        <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-slate-950 to-transparent" />
        <div className="relative mx-auto grid w-full max-w-6xl gap-12 lg:grid-cols-[1fr_.8fr] lg:items-center">
          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.28em] text-cyan-200">Spotify visual intelligence</p>
            <h1 className="max-w-4xl text-5xl font-semibold leading-tight md:text-7xl">AI Music X-Ray</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
              Connect Spotify, play a track, and watch a real-time generative scan of tempo, beats, sections, and simulated stems.
              It runs immediately in demo mode and is structured for heavier open-source analysis services later.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="/app" className="inline-flex h-10 items-center justify-center rounded-md bg-cyan-300 px-4 text-sm font-medium text-slate-950 hover:bg-cyan-200">
                Launch visualizer
              </a>
              <a href="/login" className="inline-flex h-10 items-center justify-center rounded-md border border-white/12 bg-white/6 px-4 text-sm font-medium text-white hover:bg-white/10">
                Connect Spotify
              </a>
            </div>
          </div>
          <div className="grid gap-3">
            {features.map(({ label, Icon }) => (
              <div key={label} className="rounded-lg border border-white/10 bg-white/[0.07] p-5 backdrop-blur">
                <Icon className="mb-4 h-6 w-6 text-cyan-200" />
                <p className="font-medium">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
