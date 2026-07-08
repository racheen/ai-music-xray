"use client";

import { type CSSProperties, type ReactNode, useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";

type Props = {
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
};

type Pointer = {
  x: number;
  y: number;
};

export function OrbitBackdrop({ children, className, contentClassName }: Props) {
  const [pointer, setPointer] = useState<Pointer>({ x: 0.5, y: 0.35 });
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);

    let frame = 0;
    const onMove = (event: PointerEvent) => {
      if (reducedMotion) return;
      cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        setPointer({ x: event.clientX / window.innerWidth, y: event.clientY / window.innerHeight });
      });
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      media.removeEventListener("change", update);
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, [reducedMotion]);

  const style = useMemo<CSSProperties>(
    () =>
      ({
        "--cursor-x": `${Math.round(pointer.x * 100)}%`,
        "--cursor-y": `${Math.round(pointer.y * 100)}%`,
        "--cursor-shift-x": `${(pointer.x - 0.5) * 24}px`,
        "--cursor-shift-y": `${(pointer.y - 0.5) * 24}px`
      }) as CSSProperties,
    [pointer.x, pointer.y]
  );

  return (
    <div
      className={clsx(
        "relative isolate overflow-hidden bg-[#030a06] text-white",
        reducedMotion ? "" : "motion-safe:transition-[background-position] motion-safe:duration-500",
        className
      )}
      style={style}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_var(--cursor-x)_var(--cursor-y),rgba(134,239,172,.22),transparent_20%),radial-gradient(circle_at_18%_16%,rgba(134,239,172,.11),transparent_28%),radial-gradient(circle_at_82%_28%,rgba(34,197,94,.10),transparent_26%),linear-gradient(180deg,#030a06_0%,#06120c_55%,#030a06_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(148,163,184,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,.14)_1px,transparent_1px)] [background-position:center] [background-size:90px_90px]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:radial-gradient(circle,rgba(255,255,255,.6)_1px,transparent_1px)] [background-size:28px_28px]" />
      <div
        className="pointer-events-none absolute -left-24 top-16 h-96 w-96 rounded-full bg-emerald-300/12 blur-3xl transition-transform duration-700 ease-out"
        style={{ transform: `translate3d(var(--cursor-shift-x), var(--cursor-shift-y), 0)` }}
      />
      <div
        className="pointer-events-none absolute right-[-8rem] top-1/4 h-[28rem] w-[28rem] rounded-full bg-emerald-400/10 blur-3xl transition-transform duration-700 ease-out"
        style={{ transform: `translate3d(calc(var(--cursor-shift-x) * -0.7), calc(var(--cursor-shift-y) * -0.7), 0)` }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-[#030a06] to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#030a06] to-transparent" />
      <div className={clsx("relative z-10", contentClassName)}>{children}</div>
    </div>
  );
}
