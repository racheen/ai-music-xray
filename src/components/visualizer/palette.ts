import type { Mood } from "@/types/music";

export const moodPalettes: Record<Mood, { bg: string; bass: string; drums: string; vocals: string; other: string }> = {
  chill: { bg: "#05110b", bass: "#74c69d", drums: "#95d5b2", vocals: "#d8f3dc", other: "#b7e4c7" },
  hype: { bg: "#071008", bass: "#52b788", drums: "#facc15", vocals: "#86efac", other: "#bbf7d0" },
  dark: { bg: "#020a07", bass: "#40916c", drums: "#f59e0b", vocals: "#95d5b2", other: "#74c69d" },
  dreamy: { bg: "#07120d", bass: "#95d5b2", drums: "#d8f3dc", vocals: "#b7e4c7", other: "#fef08a" }
};
