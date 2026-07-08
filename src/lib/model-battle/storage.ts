import type { AnalysisMode, ModelAnalysisRun, ProviderKey } from "./types";

export type StoredModelBattleInput = {
  trackUrl: string | null;
  trackId: string | null;
  comparisonTrackUrl: string | null;
  question: string;
  mode: AnalysisMode;
  providerKeys: ProviderKey[];
  lyricsContext: string | null;
  useListeningProfile: boolean;
};

export type StoredModelBattleState = {
  run: ModelAnalysisRun;
  input: StoredModelBattleInput;
};

export const LAST_BATTLE_STORAGE_KEY = "ai-music-xray:last-model-battle";
export const LAST_INPUT_STORAGE_KEY = "ai-music-xray:last-model-battle-input";

export function saveLastBattleState(state: StoredModelBattleState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAST_BATTLE_STORAGE_KEY, JSON.stringify(state.run));
  window.localStorage.setItem(LAST_INPUT_STORAGE_KEY, JSON.stringify(state.input));
}

export function loadLastBattleState() {
  if (typeof window === "undefined") return null;
  return parseStoredValue<StoredModelBattleState>(window.localStorage.getItem(LAST_BATTLE_STORAGE_KEY), window.localStorage.getItem(LAST_INPUT_STORAGE_KEY));
}

export function loadLastBattleRun() {
  return loadLastBattleState()?.run ?? null;
}

export function loadLastBattleInput() {
  return loadLastBattleState()?.input ?? null;
}

export function clearLastBattleState() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LAST_BATTLE_STORAGE_KEY);
  window.localStorage.removeItem(LAST_INPUT_STORAGE_KEY);
}

function parseStoredValue<TState>(runValue: string | null, inputValue: string | null) {
  if (!runValue || !inputValue) return null;
  try {
    const run = JSON.parse(runValue) as ModelAnalysisRun;
    const input = JSON.parse(inputValue) as StoredModelBattleInput;
    if (!run || !input) return null;
    return { run, input } as TState;
  } catch {
    return null;
  }
}
