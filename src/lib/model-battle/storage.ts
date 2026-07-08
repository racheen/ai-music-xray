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
export const PENDING_BATTLE_INPUT_KEY = "ai-music-xray:pending-model-battle-input";
export const PENDING_BATTLE_RUN_ID_KEY = "ai-music-xray:pending-model-battle-run-id";
export const RECENT_BATTLES_STORAGE_KEY = "ai-music-xray:recent-model-battles";
const MAX_RECENT_BATTLES = 24;

export function saveLastBattleState(state: StoredModelBattleState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAST_BATTLE_STORAGE_KEY, JSON.stringify(state.run));
  window.localStorage.setItem(LAST_INPUT_STORAGE_KEY, JSON.stringify(state.input));
  saveRecentBattle(state);
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

export function loadRecentBattleStates() {
  if (typeof window === "undefined") return [];
  try {
    const value = window.localStorage.getItem(RECENT_BATTLES_STORAGE_KEY);
    if (!value) return [];
    const parsed = JSON.parse(value) as StoredModelBattleState[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry) => entry?.run?.id && entry?.input);
  } catch {
    return [];
  }
}

export function loadStoredRunById(runId: string) {
  return loadRecentBattleStates().find((entry) => entry.run.id === runId)?.run ?? null;
}

export function savePendingBattleInput(runId: string, input: StoredModelBattleInput) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PENDING_BATTLE_RUN_ID_KEY, runId);
  window.localStorage.setItem(PENDING_BATTLE_INPUT_KEY, JSON.stringify(input));
}

export function loadPendingBattleInput(runId?: string | null) {
  if (typeof window === "undefined") return null;
  const storedRunId = window.localStorage.getItem(PENDING_BATTLE_RUN_ID_KEY);
  if (runId && storedRunId && storedRunId !== runId) return null;
  const inputValue = window.localStorage.getItem(PENDING_BATTLE_INPUT_KEY);
  if (!inputValue) return null;
  try {
    return JSON.parse(inputValue) as StoredModelBattleInput;
  } catch {
    return null;
  }
}

export function clearPendingBattleInput() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PENDING_BATTLE_RUN_ID_KEY);
  window.localStorage.removeItem(PENDING_BATTLE_INPUT_KEY);
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

function saveRecentBattle(state: StoredModelBattleState) {
  const existing = loadRecentBattleStates().filter((entry) => entry.run.id !== state.run.id);
  const next = [state, ...existing].slice(0, MAX_RECENT_BATTLES);
  window.localStorage.setItem(RECENT_BATTLES_STORAGE_KEY, JSON.stringify(next));
}
