import type { Mood } from "@/types/music";

export const moodPalettes: Record<Mood, { bg: string; bass: string; drums: string; vocals: string; other: string }> = {
  chill: { bg: "#07111f", bass: "#67e8f9", drums: "#f9a8d4", vocals: "#a7f3d0", other: "#fef08a" },
  hype: { bg: "#15080f", bass: "#fb7185", drums: "#facc15", vocals: "#22d3ee", other: "#c084fc" },
  dark: { bg: "#020617", bass: "#818cf8", drums: "#e11d48", vocals: "#94a3b8", other: "#2dd4bf" },
  dreamy: { bg: "#10091f", bass: "#c4b5fd", drums: "#f0abfc", vocals: "#7dd3fc", other: "#fde68a" }
};
