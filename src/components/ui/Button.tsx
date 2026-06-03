import { clsx } from "clsx";
import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-45",
        variant === "primary" && "bg-cyan-300 text-slate-950 hover:bg-cyan-200",
        variant === "ghost" && "border border-white/12 bg-white/6 text-white hover:bg-white/10",
        variant === "danger" && "bg-rose-500 text-white hover:bg-rose-400",
        className
      )}
      {...props}
    />
  );
}
