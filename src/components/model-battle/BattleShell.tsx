"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { clsx } from "clsx";

type BattleShellProps = {
  children: ReactNode;
  currentRoute: "model-battle" | "visualizer" | "history" | "results" | "settings";
  routeLabel?: string;
  routePath?: string;
  action?: ReactNode;
};

const navItems: Array<{ key: BattleShellProps["currentRoute"]; label: string; href: string }> = [
  { key: "model-battle", label: "Model Battle", href: "/model-battle" },
  { key: "visualizer", label: "Visualizer", href: "/visualizer" },
  { key: "history", label: "History", href: "/model-battle/history" },
  { key: "settings", label: "Settings", href: "/settings" }
];

export function BattleShell({ children, currentRoute, routeLabel, routePath, action }: BattleShellProps) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4 text-[11px] uppercase tracking-[0.28em] text-emerald-200/90">
        <div className="flex min-w-0 items-center gap-3">
          <span className="truncate font-semibold">{routeLabel ?? routeTitle(currentRoute)}</span>
          {routePath ? <span className="truncate text-slate-500">{routePath}</span> : null}
        </div>
      </div>

      <nav className="flex flex-wrap items-center justify-between gap-4 rounded-[1.7rem] border border-white/10 bg-black/25 px-4 py-3 text-sm shadow-[0_18px_80px_rgba(2,8,4,0.38)] backdrop-blur-xl">
        <Link href="/" className="inline-flex items-center gap-3 font-semibold tracking-[0.28em] text-emerald-50">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-300/10 shadow-[0_0_18px_rgba(74,222,128,0.28)]">
            ◉
          </span>
          AI MUSIC X-RAY
        </Link>

        <div className="hidden items-center gap-2 md:flex">
          {navItems.map((item) => {
            const active = item.key === currentRoute;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={clsx(
                  "rounded-full px-4 py-2 text-xs uppercase tracking-[0.2em] transition",
                  active
                    ? "border border-emerald-300/30 bg-emerald-300/12 text-emerald-50 shadow-[0_0_0_1px_rgba(134,239,172,0.12)]"
                    : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {action}
          <div
            className="h-10 w-10 rounded-full border border-white/10 bg-[radial-gradient(circle_at_35%_30%,rgba(134,239,172,.72),rgba(4,17,10,.9))] shadow-[0_0_24px_rgba(74,222,128,0.32)]"
            aria-hidden="true"
          />
        </div>
      </nav>

      {children}
    </main>
  );
}

export function BattlePanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={clsx(
        "rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(7,20,13,.88),rgba(5,14,10,.72))] shadow-[0_22px_80px_rgba(2,8,4,0.35)] backdrop-blur",
        className
      )}
    >
      {children}
    </section>
  );
}

export function BattleSectionLabel({ label, title, description }: { label: string; title: string; description?: string }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <h2 className="text-2xl font-semibold tracking-tight text-white md:text-[1.75rem]">{title}</h2>
      {description ? <p className="max-w-3xl text-sm leading-7 text-slate-300">{description}</p> : null}
    </div>
  );
}

export function BattleActionLink({
  href,
  children,
  variant = "ghost",
  className
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "ghost";
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium transition",
        variant === "primary"
          ? "bg-emerald-300 text-slate-950 hover:bg-emerald-200"
          : "border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10",
        className
      )}
    >
      {children}
    </Link>
  );
}

function routeTitle(route: BattleShellProps["currentRoute"]) {
  switch (route) {
    case "model-battle":
      return "Model Battle Setup";
    case "visualizer":
      return "Visualizer";
    case "history":
      return "History";
    case "results":
      return "Results";
    case "settings":
      return "Settings";
  }
}
