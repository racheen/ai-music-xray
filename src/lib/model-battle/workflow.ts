import { randomUUID } from "crypto";
import { demoTrack } from "@/components/spotify/demoTrack";
import { spotifyFetch } from "@/lib/spotify/session";
import { createFallbackAnalysis } from "@/lib/analysis/fallback";
import { buildComparisonSummary, enrichOutputSimilarity, evaluateModelOutput } from "./evaluator";
import { saveAnalysisRun } from "./db";
import { getEnabledProviders, listProviderAvailability } from "./providers";
import { parseAnalysisInput } from "./schema";
import type {
  AnalysisHistoryRow,
  AnalysisMode,
  AudioFeatures,
  ComparisonTrack,
  ModelAnalysisRun,
  ModelAnalysisResult,
  ModelBattleOutput,
  ProviderAvailability,
  ProviderKey,
  TrackAnalysisInput,
  TrackMetadata
} from "./types";

type SpotifyTrackPayload = {
  id: string;
  name: string;
  popularity?: number;
  duration_ms: number;
  preview_url?: string | null;
  explicit?: boolean;
  external_urls?: { spotify?: string | null };
  artists?: Array<{ id?: string; name: string }>;
  album?: {
    id?: string;
    name?: string;
    release_date?: string | null;
    label?: string | null;
    images?: Array<{ url: string }>;
  };
};

type SpotifyAudioFeaturesPayload = {
  tempo?: number | null;
  danceability?: number | null;
  energy?: number | null;
  valence?: number | null;
  acousticness?: number | null;
  instrumentalness?: number | null;
  liveness?: number | null;
  speechiness?: number | null;
  loudness?: number | null;
};

type SpotifyArtistPayload = {
  id?: string;
  name?: string;
  genres?: string[];
  popularity?: number;
};

export type ModelBattleRequest = {
  trackUrl?: string | null;
  trackId?: string | null;
  comparisonTrackUrl?: string | null;
  question?: string | null;
  mode?: AnalysisMode | null;
  providerKeys?: ProviderKey[] | null;
  lyricsContext?: string | null;
  useListeningProfile?: boolean;
};

export type ModelBattleResponse = {
  run: ModelAnalysisRun;
  providers: ProviderAvailability[];
  history?: AnalysisHistoryRow[];
};

export async function runModelBattle(request: ModelBattleRequest): Promise<ModelBattleResponse> {
  const mode = (request.mode ?? "why-do-i-like-this-song") as AnalysisMode;
  const question = request.question?.trim() || defaultQuestion(mode);
  const providers = getEnabledProviders(limitProviderKeys(request.providerKeys));
  const trackBundle = await loadTrackBundle(request.trackUrl ?? request.trackId ?? demoTrack.id, {
    lyricsContext: request.lyricsContext ?? null,
    useListeningProfile: request.useListeningProfile ?? true,
    mode,
    question,
    comparisonTrackUrl: request.comparisonTrackUrl ?? null
  });

  const analysisInput = parseAnalysisInput({
    ...trackBundle.input,
    question,
    mode,
    lyricsContext: request.lyricsContext ?? null,
    repairNote: null
  }) as TrackAnalysisInput;

  const outputs = await Promise.all(
    providers.map(async (provider): Promise<ModelBattleOutput> => {
      const startedAt = performance.now();
      let rawText = "";
      let parsed: ModelAnalysisResult;
      let retryCount = 0;

      try {
        const initial = await provider.analyzeTrack(analysisInput);
        parsed = initial;
        rawText = initial.raw_text ?? JSON.stringify(initial);
        if (needsRetry(analysisInput, initial)) {
          retryCount = 1;
          const repaired = await provider.analyzeTrack({
            ...analysisInput,
            repairNote: "Sharpen evidence, avoid unsupported lyric claims, and cite concrete metadata fields."
          });
          parsed = repaired;
          rawText = repaired.raw_text ?? JSON.stringify(repaired);
        }
      } catch (error) {
        parsed = localRepair(analysisInput, String(error));
        rawText = JSON.stringify(parsed);
        retryCount = 1;
      }

      const evaluation = evaluateModelOutput(analysisInput, parsed);
      const outputLength = rawText.length;
      const estimatedTokens = Math.max(1, Math.round(outputLength / 4));
      const latencyMs = Math.round(performance.now() - startedAt);

      return {
        providerKey: provider.key,
        providerName: provider.name,
        model: provider.model,
        latencyMs,
        outputLength,
        estimatedTokens,
        parsed,
        rawText,
        evaluation,
        similarityScore: 0,
        hallucinationRisk: evaluation.hallucinationRisk,
        retryCount
      };
    })
  );

  const enrichedOutputs = enrichOutputSimilarity(outputs);
  const summary = buildComparisonSummary(enrichedOutputs);
  const run: ModelAnalysisRun = {
    id: randomUUID(),
    mode,
    question,
    track: analysisInput.track,
    providerCount: enrichedOutputs.length,
    summary,
    createdAt: new Date().toISOString(),
    outputs: enrichedOutputs
  };

  await saveAnalysisRun(run, analysisInput).catch(() => null);

  return {
    run,
    providers: listProviderAvailability()
  };
}

function limitProviderKeys(keys?: ProviderKey[] | null) {
  if (!keys?.length) return undefined;
  return keys.slice(0, 4);
}

async function loadTrackBundle(
  identifier: string,
  options: {
    lyricsContext: string | null;
    useListeningProfile: boolean;
    mode: AnalysisMode;
    question: string;
    comparisonTrackUrl: string | null;
  }
): Promise<{ input: TrackAnalysisInput }> {
  const trackId = parseTrackIdentifier(identifier);
  const spotifyTrack = trackId ? await loadSpotifyTrack(trackId) : null;
  const comparisonTrack = options.comparisonTrackUrl ? await loadComparisonTrack(options.comparisonTrackUrl) : null;
  const audioFeatures = spotifyTrack?.audioFeatures ?? fallbackAudioFeatures(spotifyTrack?.track?.id ?? identifier);
  const track = spotifyTrack?.track ?? fallbackTrack(trackId ?? identifier);

  const input: TrackAnalysisInput = {
    track,
    artist: spotifyTrack?.artist ?? {
      name: track.artistName,
      genres: inferGenres(track, audioFeatures),
      popularity: spotifyTrack?.trackPopularity ?? 58
    },
    album: spotifyTrack?.album ?? {
      name: track.albumName,
      releaseDate: null,
      label: null
    },
    audioFeatures,
    popularity: spotifyTrack?.trackPopularity ?? 58,
    releaseDate: spotifyTrack?.album?.releaseDate ?? null,
    genreHints: spotifyTrack?.genreHints ?? inferGenres(track, audioFeatures),
    question: options.question,
    mode: options.mode,
    lyricsContext: options.lyricsContext,
    userListeningProfile: options.useListeningProfile
      ? {
          favoriteGenres: spotifyTrack?.genreHints?.slice(0, 3) ?? inferGenres(track, audioFeatures),
          typicalTempoRange: tempoBand(audioFeatures?.tempo),
          moodBias: moodBiasFromFeatures(audioFeatures),
          artistAffinity: [track.artistName]
        }
      : null,
    comparisonTrack
  };

  return { input };
}

async function loadSpotifyTrack(trackId: string) {
  const [trackResponse, featuresResponse] = await Promise.all([
    spotifyFetch(`/tracks/${trackId}`),
    spotifyFetch(`/audio-features/${trackId}`)
  ]);

  const trackPayload = trackResponse.response?.ok ? ((await trackResponse.response.json()) as SpotifyTrackPayload) : null;
  const featuresPayload = featuresResponse.response?.ok ? ((await featuresResponse.response.json()) as SpotifyAudioFeaturesPayload) : null;

  if (!trackPayload) return null;

  const artistId = trackPayload.artists?.[0]?.id as string | undefined;
  const artistResponse = artistId ? await spotifyFetch(`/artists/${artistId}`) : null;
  const artistPayload = artistResponse?.response?.ok ? ((await artistResponse.response.json()) as SpotifyArtistPayload) : null;

  const track: TrackMetadata = {
    id: trackPayload.id,
    name: trackPayload.name,
    artistName: trackPayload.artists?.map((artist: { name: string }) => artist.name).join(", ") ?? "Unknown Artist",
    artistId,
    albumName: trackPayload.album?.name ?? "Unknown Album",
    albumId: trackPayload.album?.id,
    albumArt: trackPayload.album?.images?.[0]?.url ?? null,
    durationMs: trackPayload.duration_ms ?? 0,
    previewUrl: trackPayload.preview_url ?? null,
    spotifyUrl: trackPayload.external_urls?.spotify ?? null,
    explicit: trackPayload.explicit
  };

  return {
    track,
    trackPopularity: trackPayload.popularity as number | undefined,
    audioFeatures: normalizeAudioFeatures(featuresPayload),
    artist: {
      id: artistPayload?.id ?? artistId,
      name: artistPayload?.name ?? track.artistName,
      genres: Array.isArray(artistPayload?.genres) ? artistPayload.genres : [],
      popularity: artistPayload?.popularity
    },
    album: {
      id: trackPayload.album?.id,
      name: trackPayload.album?.name ?? "Unknown Album",
      releaseDate: trackPayload.album?.release_date ?? null,
      label: trackPayload.album?.label ?? null
    },
    genreHints: [...(Array.isArray(artistPayload?.genres) ? artistPayload.genres : []), ...inferGenres(track, normalizeAudioFeatures(featuresPayload))]
  };
}

async function loadComparisonTrack(identifier: string): Promise<ComparisonTrack | null> {
  const trackId = parseTrackIdentifier(identifier);
  if (!trackId) return null;
  const response = await spotifyFetch(`/tracks/${trackId}`);
  if (!response.response?.ok) return null;
  const payload = (await response.response.json()) as SpotifyTrackPayload;
  return {
    id: payload.id,
    name: payload.name,
    artistName: payload.artists?.map((artist: { name: string }) => artist.name).join(", ") ?? "Unknown Artist",
    releaseDate: payload.album?.release_date ?? null,
    genreHints: []
  };
}

function parseTrackIdentifier(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/(?:spotify:track:|open\.spotify\.com\/track\/)([A-Za-z0-9]+)/);
  if (match?.[1]) return match[1];
  if (/^[A-Za-z0-9]{10,}$/.test(trimmed)) return trimmed;
  return null;
}

function defaultQuestion(mode: AnalysisMode) {
  const questions: Record<AnalysisMode, string> = {
    "why-do-i-like-this-song": "Why do I like this song?",
    "song-personality-profile": "What personality does this song project?",
    "genre-and-influence-analysis": "What genres and influences does this song suggest?",
    "commercial-virality-potential": "How viral or commercially viable is this track?",
    "emotional-arc-analysis": "What emotional arc does this song follow?",
    "production-and-sound-design-analysis": "What does the production and sound design say here?",
    "compare-two-songs": "How does this song compare to the other track?",
    "casual-listener-explanation": "Explain this song like I’m a casual listener.",
    "producer-explanation": "Explain this song like I’m a music producer."
  };
  return questions[mode];
}

function fallbackTrack(trackId: string): TrackMetadata {
  return {
    id: trackId,
    name: "Neon Orbit",
    artistName: "Synthetic Session",
    albumName: "X-Ray Demo Tapes",
    albumArt: demoTrack.albumArt,
    durationMs: demoTrack.durationMs,
    previewUrl: null,
    spotifyUrl: null,
    explicit: false
  };
}

function fallbackAudioFeatures(trackId: string): AudioFeatures {
  const fallback = createFallbackAnalysis({ trackId, durationMs: demoTrack.durationMs, tempo: demoTrack.tempo });
  return {
    tempo: fallback.tempo,
    danceability: 0.76,
    energy: 0.72,
    valence: 0.58,
    acousticness: 0.15,
    instrumentalness: 0.2,
    liveness: 0.11,
    speechiness: 0.06,
    loudness: -7.8
  };
}

function normalizeAudioFeatures(featuresPayload: SpotifyAudioFeaturesPayload | null): AudioFeatures | null {
  if (!featuresPayload) return null;
  return {
    tempo: featuresPayload.tempo ?? null,
    danceability: featuresPayload.danceability ?? null,
    energy: featuresPayload.energy ?? null,
    valence: featuresPayload.valence ?? null,
    acousticness: featuresPayload.acousticness ?? null,
    instrumentalness: featuresPayload.instrumentalness ?? null,
    liveness: featuresPayload.liveness ?? null,
    speechiness: featuresPayload.speechiness ?? null,
    loudness: featuresPayload.loudness ?? null
  };
}

function inferGenres(track: TrackMetadata, features?: AudioFeatures | null) {
  const inferred = new Set<string>();
  if ((features?.energy ?? 0) > 0.75) inferred.add("high-energy pop");
  if ((features?.acousticness ?? 0) > 0.5) inferred.add("acoustic");
  if ((features?.instrumentalness ?? 0) > 0.4) inferred.add("electronic");
  if (track.name.toLowerCase().includes("dream")) inferred.add("dream pop");
  if (track.artistName.toLowerCase().includes("synthetic")) inferred.add("electronica");
  return Array.from(inferred);
}

function tempoBand(tempo?: number | null): [number, number] | undefined {
  if (!tempo) return undefined;
  const min = Math.max(60, tempo - 12);
  const max = tempo + 12;
  return [Math.round(min), Math.round(max)];
}

function moodBiasFromFeatures(features?: AudioFeatures | null) {
  const bias = [];
  if ((features?.energy ?? 0) > 0.7) bias.push("energized");
  if ((features?.valence ?? 0) > 0.6) bias.push("uplifted");
  if ((features?.acousticness ?? 0) > 0.5) bias.push("organic");
  if ((features?.instrumentalness ?? 0) > 0.4) bias.push("textural");
  return bias;
}

function needsRetry(input: TrackAnalysisInput, output: ModelAnalysisResult) {
  if (output.confidence < 0.5) return true;
  if (!input.lyricsContext && output.evidence.some((entry) => entry.source_field.toLowerCase().includes("lyrics"))) return true;
  return output.limitations.length === 0 && output.evidence.length < 2;
}

function localRepair(input: TrackAnalysisInput, reason: string): ModelAnalysisResult {
  return {
    summary: `Fallback analysis for ${input.track.name} by ${input.track.artistName} because the provider failed: ${reason}. The result is intentionally conservative and metadata-led.`,
    emotional_profile: ["fallback", "conservative", "metadata-led"],
    genre_hypothesis: input.genreHints.slice(0, 3),
    production_notes: ["A provider error triggered the local repair path, so only inspectable metadata is used."],
    listener_match_reasons: [input.question],
    virality_factors: ["No remote model output was available, so virality is not meaningfully assessed."],
    confidence: 0.36,
    evidence: [
      {
        claim: "The analysis was repaired locally after a provider failure.",
        source_field: "workflow.retry",
        support_level: "strong"
      }
    ],
    limitations: ["Remote provider failed and the workflow returned a deterministic backup result."],
    recommended_visualization: "failure-state comparison card",
    raw_text: reason
  };
}
