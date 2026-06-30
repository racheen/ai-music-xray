import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#04110a] px-5 text-center text-white">
      <div>
        <h1 className="text-4xl font-semibold">Signal lost</h1>
        <Link href="/" className="mt-4 inline-flex text-emerald-200 hover:text-emerald-100">Return home</Link>
      </div>
    </main>
  );
}
