import { CheckCircle2, CircleAlert } from "lucide-react";
import Link from "next/link";

const envRows = [
  ["SPOTIFY_CLIENT_ID", process.env.SPOTIFY_CLIENT_ID],
  ["SPOTIFY_CLIENT_SECRET", process.env.SPOTIFY_CLIENT_SECRET],
  ["NEXT_PUBLIC_APP_URL", process.env.NEXT_PUBLIC_APP_URL],
  ["SPOTIFY_REDIRECT_URI", process.env.SPOTIFY_REDIRECT_URI],
  ["AUDIO_ANALYSIS_API_URL", process.env.AUDIO_ANALYSIS_API_URL]
];

export default function SettingsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return <SettingsContent searchParams={searchParams} />;
}

async function SettingsContent({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return (
    <main className="min-h-dvh bg-[#04110a] px-5 py-10 text-white">
      <div className="mx-auto max-w-4xl">
        <nav className="mb-8 flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold tracking-[0.22em] text-emerald-100">AI MUSIC X-RAY</Link>
          <Link href="/app" className="text-sm text-slate-300 hover:text-white">Open app</Link>
        </nav>
        <h1 className="text-4xl font-semibold">Settings</h1>
        <p className="mt-3 max-w-2xl text-slate-300">
          Deployment readiness, Spotify configuration, and analysis service status.
        </p>
        {params.error ? (
          <div className="mt-6 rounded-md border border-amber-300/25 bg-amber-300/10 p-4 text-amber-100">
            {params.error}
          </div>
        ) : null}
        <section className="mt-8 grid gap-4">
          {envRows.map(([key, value]) => (
            <div key={key} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.07] p-4">
              <div>
                <p className="font-mono text-sm text-slate-200">{key}</p>
                <p className="mt-1 text-sm text-slate-400">{value ? "Configured" : "Missing"}</p>
              </div>
              {value ? <CheckCircle2 className="text-emerald-300" /> : <CircleAlert className="text-amber-300" />}
            </div>
          ))}
        </section>
        <section className="mt-8 rounded-lg border border-white/10 bg-white/[0.07] p-5">
          <h2 className="text-xl font-semibold">External analysis service</h2>
          <p className="mt-2 text-slate-300">
            Disabled by default. The app uses generated beats and simulated stems unless you connect a separate Python service and point
            the server-side proxy at <span className="font-mono text-emerald-100">/api/analyze-track</span> with
            <span className="font-mono text-emerald-100"> AUDIO_ANALYSIS_API_URL</span>.
          </p>
        </section>
      </div>
    </main>
  );
}
