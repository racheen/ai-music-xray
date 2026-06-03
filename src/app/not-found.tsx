import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-slate-950 px-5 text-center text-white">
      <div>
        <h1 className="text-4xl font-semibold">Signal lost</h1>
        <Link href="/" className="mt-4 inline-flex text-cyan-200 hover:text-cyan-100">Return home</Link>
      </div>
    </main>
  );
}
