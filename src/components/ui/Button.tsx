import { clsx } from "clsx";
import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-45",
        variant === "primary" && "bg-emerald-300 text-slate-950 shadow-[0_10px_30px_rgba(74,222,128,0.24)] hover:bg-emerald-200",
        variant === "ghost" && "border border-white/12 bg-white/6 text-white backdrop-blur hover:bg-white/10",
        variant === "danger" && "bg-rose-500 text-white hover:bg-rose-400",
        className
      )}
      {...props}
    />
  );
}
