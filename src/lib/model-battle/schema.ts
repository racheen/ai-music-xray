import { z } from "zod";
import { analysisModes } from "./types";

const analysisModeValues = analysisModes.map((mode) => mode.id) as [string, ...string[]];

export const evidenceSchema = z.object({
  claim: z.string().min(1),
  source_field: z.string().min(1),
  support_level: z.enum(["strong", "medium", "weak"])
});

export const modelAnalysisResultSchema = z.object({
  summary: z.string().min(1),
  emotional_profile: z.array(z.string().min(1)).default([]),
  genre_hypothesis: z.array(z.string().min(1)).default([]),
  production_notes: z.array(z.string().min(1)).default([]),
  listener_match_reasons: z.array(z.string().min(1)).default([]),
  virality_factors: z.array(z.string().min(1)).default([]),
  confidence: z.number().min(0).max(1),
  evidence: z.array(evidenceSchema).default([]),
  limitations: z.array(z.string().min(1)).default([]),
  recommended_visualization: z.string().min(1)
});

export const trackMetadataSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  artistName: z.string().min(1),
  artistId: z.string().optional(),
  albumName: z.string().min(1),
  albumId: z.string().optional(),
  albumArt: z.string().min(1).nullable().optional(),
  durationMs: z.number().int().positive(),
  previewUrl: z.string().min(1).nullable().optional(),
  spotifyUrl: z.string().min(1).nullable().optional(),
  explicit: z.boolean().optional()
});

export const analysisInputSchema = z.object({
  track: trackMetadataSchema,
  artist: z.object({
    id: z.string().optional(),
    name: z.string().min(1),
    genres: z.array(z.string().min(1)).default([]),
    popularity: z.number().min(0).max(100).optional()
  }),
  album: z.object({
    id: z.string().optional(),
    name: z.string().min(1),
    releaseDate: z.string().nullable().optional(),
    label: z.string().nullable().optional()
  }),
  audioFeatures: z
    .object({
      tempo: z.number().nullable().optional(),
      danceability: z.number().min(0).max(1).nullable().optional(),
      energy: z.number().min(0).max(1).nullable().optional(),
      valence: z.number().min(0).max(1).nullable().optional(),
      acousticness: z.number().min(0).max(1).nullable().optional(),
      instrumentalness: z.number().min(0).max(1).nullable().optional(),
      liveness: z.number().min(0).max(1).nullable().optional(),
      speechiness: z.number().min(0).max(1).nullable().optional(),
      loudness: z.number().nullable().optional()
    })
    .nullable()
    .optional(),
  popularity: z.number().min(0).max(100).nullable().optional(),
  releaseDate: z.string().nullable().optional(),
  genreHints: z.array(z.string().min(1)).default([]),
  question: z.string().min(1),
  mode: z.enum(analysisModeValues),
  lyricsContext: z.string().nullable().optional(),
  userListeningProfile: z
    .object({
      favoriteGenres: z.array(z.string().min(1)).optional(),
      typicalTempoRange: z.tuple([z.number(), z.number()]).optional(),
      moodBias: z.array(z.string().min(1)).optional(),
      artistAffinity: z.array(z.string().min(1)).optional()
    })
    .nullable()
    .optional(),
  comparisonTrack: z
    .object({
      id: z.string().optional(),
      name: z.string().min(1),
      artistName: z.string().min(1),
      releaseDate: z.string().nullable().optional(),
      genreHints: z.array(z.string().min(1)).optional()
    })
    .nullable()
    .optional(),
  repairNote: z.string().nullable().optional()
});

export const analysisRequestSchema = z.object({
  trackUrl: z.string().min(1).nullable().optional(),
  trackId: z.string().min(1).nullable().optional(),
  comparisonTrackUrl: z.string().min(1).nullable().optional(),
  question: z.string().min(1).nullable().optional(),
  mode: z.enum(analysisModeValues).nullable().optional(),
  providerKeys: z.array(z.string().min(1)).nullable().optional(),
  lyricsContext: z.string().nullable().optional(),
  useListeningProfile: z.boolean().optional()
});

export const comparisonSummarySchema = z.object({
  agreesOn: z.array(z.string().min(1)),
  disagreesOn: z.array(z.string().min(1)),
  mostCreativeModel: z.string().min(1),
  mostGroundedModel: z.string().min(1),
  mostCautiousModel: z.string().min(1),
  bestOverallAnswer: z.string().min(1),
  similarityMatrix: z.array(
    z.object({
      left: z.string().min(1),
      right: z.string().min(1),
      score: z.number().min(0).max(100)
    })
  )
});

export const analysisHistoryRowSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  mode: z.enum(analysisModeValues),
  trackName: z.string(),
  artistName: z.string(),
  bestOverallAnswer: z.string(),
  providerCount: z.number().int().nonnegative(),
  averageConfidence: z.number().min(0).max(1),
  averageHallucinationRisk: z.number().min(0).max(100),
  summary: z.string()
});

export function parseModelAnalysisResult(value: unknown) {
  return modelAnalysisResultSchema.parse(value);
}

export function parseAnalysisInput(value: unknown) {
  return analysisInputSchema.parse(value);
}
