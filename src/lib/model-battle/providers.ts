import { createHash } from "crypto";
import { parseModelAnalysisResult } from "./schema";
import type {
  AnalysisMode,
  AudioFeatures,
  ModelAnalysisResult,
  ProviderAvailability,
  ProviderKey,
  TrackAnalysisInput
} from "./types";

export interface AIProvider {
  key: ProviderKey;
  name: string;
  model: string;
  enabled: boolean;
  analyzeTrack(input: TrackAnalysisInput): Promise<ModelAnalysisResult>;
}

type ProviderSpec = {
  key: ProviderKey;
  name: string;
  model: string;
  envFlag?: string;
  apiKey?: string;
  baseUrl?: string;
  enabledByDefault?: boolean;
  personality: {
    confidenceBias: number;
    creativityBias: number;
    cautionBias: number;
    groundingBias: number;
  };
};

const providerSpecs: ProviderSpec[] = [
  {
    key: "openai",
    name: "OpenAI",
    model: "gpt-4.1-mini",
    envFlag: process.env.AI_PROVIDER_OPENAI,
    apiKey: process.env.OPENAI_API_KEY,
    enabledByDefault: Boolean(process.env.OPENAI_API_KEY),
    personality: { confidenceBias: 0.08, creativityBias: 0.18, cautionBias: 0.08, groundingBias: 0.18 }
  },
  {
    key: "anthropic",
    name: "Anthropic",
    model: "claude-3-5-sonnet-20240620",
    envFlag: process.env.AI_PROVIDER_ANTHROPIC,
    apiKey: process.env.ANTHROPIC_API_KEY,
    enabledByDefault: Boolean(process.env.ANTHROPIC_API_KEY),
    personality: { confidenceBias: 0.04, creativityBias: 0.12, cautionBias: 0.18, groundingBias: 0.22 }
  },
  {
    key: "gemini",
    name: "Google Gemini",
    model: "gemini-1.5-pro",
    envFlag: process.env.AI_PROVIDER_GEMINI,
    apiKey: process.env.GEMINI_API_KEY,
    enabledByDefault: Boolean(process.env.GEMINI_API_KEY),
    personality: { confidenceBias: 0.02, creativityBias: 0.24, cautionBias: 0.05, groundingBias: 0.14 }
  },
  {
    key: "mistral",
    name: "Mistral",
    model: "mistral-large-latest",
    envFlag: process.env.AI_PROVIDER_MISTRAL,
    apiKey: process.env.MISTRAL_API_KEY,
    enabledByDefault: Boolean(process.env.MISTRAL_API_KEY),
    personality: { confidenceBias: 0.03, creativityBias: 0.1, cautionBias: 0.1, groundingBias: 0.2 }
  },
  {
    key: "ollama",
    name: "Ollama",
    model: process.env.OLLAMA_MODEL ?? "llama3.1",
    envFlag: process.env.AI_PROVIDER_OLLAMA,
    baseUrl: process.env.OLLAMA_BASE_URL,
    enabledByDefault: Boolean(process.env.OLLAMA_BASE_URL),
    personality: { confidenceBias: -0.05, creativityBias: 0.08, cautionBias: 0.22, groundingBias: 0.12 }
  },
  {
    key: "local",
    name: "Local Fallback",
    model: "deterministic-sim",
    enabledByDefault: true,
    personality: { confidenceBias: -0.02, creativityBias: 0.12, cautionBias: 0.16, groundingBias: 0.1 }
  }
];

export function listProviderAvailability(): ProviderAvailability[] {
  return providerSpecs.map((spec) => ({
    key: spec.key,
    label: spec.name,
    enabled: isProviderEnabled(spec),
    model: spec.model,
    reason: isProviderEnabled(spec) ? "enabled" : "disabled by environment"
  }));
}

export function getEnabledProviders(selectedKeys?: ProviderKey[]) {
  return providerSpecs
    .filter((spec) => (selectedKeys?.length ? selectedKeys.includes(spec.key) : isProviderEnabled(spec)))
    .filter((spec) => isProviderEnabled(spec))
    .map((spec) => createProvider(spec));
}

export function getProviderLabels(keys: ProviderKey[]) {
  return providerSpecs.filter((spec) => keys.includes(spec.key));
}

function createProvider(spec: ProviderSpec): AIProvider {
  return {
    key: spec.key,
    name: spec.name,
    model: spec.model,
    enabled: isProviderEnabled(spec),
    async analyzeTrack(input: TrackAnalysisInput) {
      const remote = await tryRemoteAnalysis(spec, input);
      if (remote) return remote;
      return createSimulatedAnalysis(spec, input);
    }
  };
}

function isProviderEnabled(spec: ProviderSpec) {
  if (spec.key === "local") return true;
  const flag = normalizeFlag(spec.envFlag);
  if (flag === true) return true;
  if (flag === false) return false;
  return Boolean(spec.enabledByDefault);
}

function normalizeFlag(value?: string) {
  if (value == null) return null;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return null;
}

async function tryRemoteAnalysis(spec: ProviderSpec, input: TrackAnalysisInput): Promise<ModelAnalysisResult | null> {
  if (spec.key === "local") return null;
  if (spec.key === "ollama") {
    if (!spec.baseUrl) return null;
    return callOllama(spec.baseUrl, spec.model, input);
  }
  if (!spec.apiKey) return null;

  switch (spec.key) {
    case "openai":
      return callOpenAI(spec.apiKey, spec.model, input);
    case "anthropic":
      return callAnthropic(spec.apiKey, spec.model, input);
    case "gemini":
      return callGemini(spec.apiKey, spec.model, input);
    case "mistral":
      return callMistral(spec.apiKey, spec.model, input);
    default:
      return null;
  }
}

async function callOpenAI(apiKey: string, model: string, input: TrackAnalysisInput) {
  const payload = {
    model,
    input: [
      { role: "system", content: [{ type: "text", text: systemPrompt(input.mode) }] },
      { role: "user", content: [{ type: "text", text: buildPrompt(input) }] }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "model_analysis",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false
        }
      }
    }
  };
  return callJsonEndpoint("https://api.openai.com/v1/responses", apiKey, payload, extractOpenAIText);
}

async function callAnthropic(apiKey: string, model: string, input: TrackAnalysisInput) {
  const payload = {
    model,
    max_tokens: 1800,
    system: systemPrompt(input.mode),
    messages: [{ role: "user", content: buildPrompt(input) }]
  };
  return callJsonEndpoint("https://api.anthropic.com/v1/messages", apiKey, payload, extractAnthropicText, {
    "anthropic-version": "2023-06-01"
  });
}

async function callGemini(apiKey: string, model: string, input: TrackAnalysisInput) {
  const payload = {
    contents: [{ role: "user", parts: [{ text: `${systemPrompt(input.mode)}\n\n${buildPrompt(input)}` }] }],
    generationConfig: {
      responseMimeType: "application/json"
    }
  };
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  return callJsonEndpoint(url, undefined, payload, extractGeminiText);
}

async function callMistral(apiKey: string, model: string, input: TrackAnalysisInput) {
  const payload = {
    model,
    messages: [
      { role: "system", content: systemPrompt(input.mode) },
      { role: "user", content: buildPrompt(input) }
    ],
    response_format: { type: "json_object" }
  };
  return callJsonEndpoint("https://api.mistral.ai/v1/chat/completions", apiKey, payload, extractMistralText);
}

async function callOllama(baseUrl: string, model: string, input: TrackAnalysisInput) {
  const payload = {
    model,
    stream: false,
    format: "json",
    messages: [
      { role: "system", content: systemPrompt(input.mode) },
      { role: "user", content: buildPrompt(input) }
    ]
  };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: "no-store"
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { message?: { content?: string } };
    return parseModelAnalysisResult(JSON.parse(data.message?.content ?? "{}"));
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function callJsonEndpoint(
  url: string,
  apiKey: string | undefined,
  payload: unknown,
  extractText: (data: unknown) => string | null,
  extraHeaders?: Record<string, string>
): Promise<ModelAnalysisResult | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        ...extraHeaders
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: "no-store"
    });
    if (!response.ok) return null;
    const data = (await response.json()) as unknown;
    const text = extractText(data);
    if (!text) return null;
    return parseModelAnalysisResult(JSON.parse(text));
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function extractOpenAIText(data: unknown) {
  const payload = data as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> };
  if (typeof payload.output_text === "string") return payload.output_text;
  return payload.output?.[0]?.content?.[0]?.text ?? null;
}

function extractAnthropicText(data: unknown) {
  const payload = data as { content?: Array<{ text?: string }> };
  return payload.content?.[0]?.text ?? null;
}

function extractGeminiText(data: unknown) {
  const payload = data as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return payload.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

function extractMistralText(data: unknown) {
  const payload = data as { choices?: Array<{ message?: { content?: string } }> };
  return payload.choices?.[0]?.message?.content ?? null;
}

function createSimulatedAnalysis(spec: ProviderSpec, input: TrackAnalysisInput): ModelAnalysisResult {
  const fingerprint = hash(`${spec.key}:${input.track.id}:${input.mode}:${input.question}`);
  const tempo = input.audioFeatures?.tempo ?? 110;
  const energy = input.audioFeatures?.energy ?? 0.68;
  const valence = input.audioFeatures?.valence ?? 0.54;
  const confidenceBase = clamp01(
    0.58 +
      spec.personality.confidenceBias +
      (input.lyricsContext ? 0.05 : -0.02) +
      (input.userListeningProfile ? 0.04 : 0) +
      (input.genreHints.length ? 0.04 : -0.03)
  );
  const creativeTone = spec.personality.creativityBias + (fingerprint[0] % 7) * 0.01;
  const riskReducer = input.lyricsContext ? 0.08 : 0.03;

  const emotionalProfile = unique([
    toneFromAudio(tempo, energy, valence),
    moodFromMode(input.mode),
    creativeTone > 0.18 ? "textural" : "grounded",
    input.userListeningProfile?.moodBias?.[0] ?? "self-aware"
  ]);

  const genreHypothesis = unique([
    ...input.genreHints.slice(0, 3),
    input.artist.genres[0],
    genreFromAudio(input.audioFeatures),
    input.comparisonTrack ? `adjacent to ${input.comparisonTrack.artistName}` : null
  ]);

  const productionNotes = unique([
    `Tempo sits around ${Math.round(tempo)} BPM, which suggests ${tempo > 120 ? "forward motion" : "an unhurried pocket"}.`,
    audioFeatureNote(input.audioFeatures),
    input.audioFeatures?.instrumentalness != null && input.audioFeatures.instrumentalness > 0.35
      ? "Instrumentation likely carries the emotional story as much as the topline."
      : "The topline and groove appear to share the emotional load.",
    input.repairNote ? `Refined after validation feedback: ${input.repairNote}` : null
  ]);

  const listenerMatchReasons = unique([
    `The track aligns with a ${input.mode.replaceAll("-", " ")} framing.`,
    input.userListeningProfile?.favoriteGenres?.length
      ? `It overlaps with your favorite genres: ${input.userListeningProfile.favoriteGenres.slice(0, 2).join(", ")}.`
      : "The response is anchored in broad, inspectable metadata rather than a narrow taste profile.",
    input.question.toLowerCase().includes("why")
      ? "It explains the likely reason the song lands emotionally."
      : "It turns structured metadata into a readable interpretation."
  ]);

  const viralityFactors = unique([
    input.popularity != null ? `Popularity around ${input.popularity} signals existing audience traction.` : "Popularity is unavailable, so traction is inferred from the audio profile.",
    energy > 0.7 ? "High energy can support replayability and short-form clip potential." : "Moderate energy may favor mood-driven rather than meme-driven spread.",
    valence > 0.55 ? "A bright emotional tone usually makes sharing easier." : "A more introspective tone can still spread if the hook is distinctive."
  ]);

  const limitations = unique([
    input.lyricsContext ? null : "No lyrics were provided, so lyric-specific claims are avoided.",
    input.userListeningProfile ? null : "No listening profile was connected, so personalization is approximate.",
    input.audioFeatures ? null : "Audio features were partially missing, so sound-design claims stay conservative."
  ]);

  const evidence: ModelAnalysisResult["evidence"] = [
    {
      claim: `Metadata points to ${input.track.name} by ${input.track.artistName}.`,
      source_field: "track.name + track.artistName",
      support_level: "strong" as const
    },
    {
      claim: `The production read is informed by tempo, energy, and valence.`,
      source_field: "audioFeatures.tempo + energy + valence",
      support_level: input.audioFeatures ? "strong" : "weak"
    },
    {
      claim: input.genreHints.length ? `Genre hints reinforce ${input.genreHints[0]}.` : "Genre hints are sparse, so genre is inferred cautiously.",
      source_field: "genreHints",
      support_level: input.genreHints.length ? "medium" : "weak"
    }
  ];

  const recommendedVisualization = recommendationFromMode(input.mode);

  const result: ModelAnalysisResult = {
    summary: summaryFromMode(input, spec.name, confidenceBase, creativeTone),
    emotional_profile: emotionalProfile,
    genre_hypothesis: genreHypothesis,
    production_notes: productionNotes,
    listener_match_reasons: listenerMatchReasons,
    virality_factors: viralityFactors,
    confidence: clamp01(confidenceBase + spec.personality.groundingBias - riskReducer),
    evidence,
    limitations,
    recommended_visualization: recommendedVisualization
  };

  return parseModelAnalysisResult(result);
}

function summaryFromMode(input: TrackAnalysisInput, providerName: string, confidence: number, creativity: number) {
  const track = `${input.track.name} by ${input.track.artistName}`;
  const base = {
    "why-do-i-like-this-song":
      `(${providerName}) ${track} likely works because the groove, emotional tone, and repetition line up with your listener profile, making the song feel familiar without becoming static.`,
    "song-personality-profile":
      `(${providerName}) ${track} reads like a ${creativity > 0.18 ? "slightly cinematic" : "cleanly defined"} personality: direct, rhythmic, and built to hold attention without overstating its case.`,
    "genre-and-influence-analysis":
      `(${providerName}) ${track} appears to sit in a small genre neighborhood rather than a single bucket, with influence clues coming from the available metadata more than any lyric-specific evidence.`,
    "commercial-virality-potential":
      `(${providerName}) ${track} has moderate-to-strong potential for repeat listens if the hook lands quickly, but the strongest signal is whether the track’s energy and clarity survive short-form clipping.`,
    "emotional-arc-analysis":
      `(${providerName}) ${track} moves like a controlled arc rather than a dramatic swing, so the emotional payoff likely comes from layering and pacing instead of a single sudden drop.`,
    "production-and-sound-design-analysis":
      `(${providerName}) ${track} reads as a production-led record where tempo, density, and texture matter as much as melody, and the analysis stays grounded in the provided features.`,
    "compare-two-songs":
      `(${providerName}) ${track} can be compared against the reference track by mapping energy, mood, and genre cues rather than assuming they share the same emotional function.`,
    "casual-listener-explanation":
      `(${providerName}) ${track} is the kind of song that feels easy to follow because the core mood and rhythm line up cleanly, even when the finer production details are doing more work underneath.`,
    "producer-explanation":
      `(${providerName}) ${track} is best understood through arrangement, spectral density, and groove placement, with the supplied features giving enough structure for a useful first-pass producer read.`
  } satisfies Record<string, string>;

  return `${base[input.mode]} Confidence is ${Math.round(confidence * 100)}%.`;
}

function buildPrompt(input: TrackAnalysisInput) {
  return JSON.stringify(
    {
      mode: input.mode,
      question: input.question,
      track: input.track,
      artist: input.artist,
      album: input.album,
      audioFeatures: input.audioFeatures,
      popularity: input.popularity,
      releaseDate: input.releaseDate,
      genreHints: input.genreHints,
      lyricsContext: input.lyricsContext ?? null,
      userListeningProfile: input.userListeningProfile ?? null,
      comparisonTrack: input.comparisonTrack ?? null,
      repairNote: input.repairNote ?? null,
      outputSchema: {
        summary: "string",
        emotional_profile: ["string"],
        genre_hypothesis: ["string"],
        production_notes: ["string"],
        listener_match_reasons: ["string"],
        virality_factors: ["string"],
        confidence: "number from 0 to 1",
        evidence: [{ claim: "string", source_field: "string", support_level: "strong|medium|weak" }],
        limitations: ["string"],
        recommended_visualization: "string"
      }
    },
    null,
    2
  );
}

function systemPrompt(mode: AnalysisMode) {
  return [
    "You are a music analysis assistant for an AI comparison dashboard.",
    "Use only the provided structured input.",
    "Do not invent lyrics, instruments, or artist facts that are not in the input.",
    "Return JSON that matches the required schema exactly.",
    `Current analysis mode: ${mode}.`
  ].join(" ");
}

function toneFromAudio(tempo: number, energy: number, valence: number) {
  if (tempo >= 128 && energy >= 0.7) return "kinetic";
  if (valence >= 0.65) return "bright";
  if (energy <= 0.45) return "intimate";
  return "balanced";
}

function genreFromAudio(features?: AudioFeatures | null) {
  if (!features) return "genre-fluid";
  if ((features.acousticness ?? 0) > 0.55) return "acoustic-pop";
  if ((features.instrumentalness ?? 0) > 0.45) return "electronic";
  if ((features.energy ?? 0) > 0.75) return "mainstream pop";
  return "indie-pop";
}

function audioFeatureNote(features?: AudioFeatures | null) {
  if (!features) return "Audio-feature metadata is missing, so the model should stay conservative about arrangement claims.";
  const parts = [
    features.danceability != null ? `danceability around ${features.danceability.toFixed(2)}` : null,
    features.energy != null ? `energy around ${features.energy.toFixed(2)}` : null,
    features.valence != null ? `valence around ${features.valence.toFixed(2)}` : null
  ].filter(Boolean);
  return parts.length ? `The feature mix suggests ${parts.join(", ")}.` : "Feature coverage is too light for detailed sound design claims.";
}

function moodFromMode(mode: AnalysisMode) {
  switch (mode) {
    case "commercial-virality-potential":
      return "strategic";
    case "producer-explanation":
      return "technical";
    case "casual-listener-explanation":
      return "approachable";
    default:
      return "curious";
  }
}

function recommendationFromMode(mode: AnalysisMode) {
  switch (mode) {
    case "commercial-virality-potential":
      return "agreement heatmap";
    case "production-and-sound-design-analysis":
      return "waveform emotional arc";
    case "compare-two-songs":
      return "side-by-side similarity constellation";
    case "producer-explanation":
      return "AI council with evidence callouts";
    default:
      return "emotional radar and agreement ribbons";
  }
}

function unique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value && value.trim().length))));
}

function hash(value: string) {
  const digest = createHash("sha1").update(value).digest("hex");
  return Array.from(digest.slice(0, 12)).map((char) => Number.parseInt(char, 16)).filter((value) => Number.isFinite(value));
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function scoreToPercent(value: number) {
  return Math.round(clamp01(value) * 100);
}

export function buildProviderCatalog() {
  return providerSpecs.map((spec) => ({
    key: spec.key,
    name: spec.name,
    model: spec.model,
    enabled: isProviderEnabled(spec)
  }));
}

export function isProviderSelected(key: ProviderKey, selectedKeys?: ProviderKey[]) {
  if (!selectedKeys?.length) return true;
  return selectedKeys.includes(key);
}

export { scoreToPercent };
