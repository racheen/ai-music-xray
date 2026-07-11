export const analysisModes = [
  { id: "why-do-i-like-this-song", label: "Why do I like this song?" },
  { id: "song-personality-profile", label: "Song personality profile" },
  { id: "genre-and-influence-analysis", label: "Genre and influence analysis" },
  { id: "commercial-virality-potential", label: "Commercial / virality potential" },
  { id: "emotional-arc-analysis", label: "Emotional arc analysis" },
  { id: "production-and-sound-design-analysis", label: "Production and sound design analysis" },
  { id: "compare-two-songs", label: "Compare this song to another song" },
  { id: "casual-listener-explanation", label: "Explain like I’m a casual listener" },
  { id: "producer-explanation", label: "Explain like I’m a music producer" }
] as const;

export const providerKeys = ["openai", "anthropic", "gemini", "mistral", "ollama", "local"] as const;

export type AnalysisMode = (typeof analysisModes)[number]["id"];
export type ProviderKey = (typeof providerKeys)[number];

export type TrackMetadata = {
  id: string;
  name: string;
  artistName: string;
  artistId?: string;
  albumName: string;
  albumId?: string;
  albumArt?: string | null;
  durationMs: number;
  previewUrl?: string | null;
  spotifyUrl?: string | null;
  explicit?: boolean;
};

export type ArtistMetadata = {
  id?: string;
  name: string;
  genres: string[];
  popularity?: number;
};

export type AlbumMetadata = {
  id?: string;
  name: string;
  releaseDate?: string | null;
  label?: string | null;
};

export type AudioFeatures = {
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

export type ListeningProfile = {
  favoriteGenres?: string[];
  typicalTempoRange?: [number, number];
  moodBias?: string[];
  artistAffinity?: string[];
};

export type ComparisonTrack = {
  id?: string;
  name: string;
  artistName: string;
  releaseDate?: string | null;
  genreHints?: string[];
};

export type TrackAnalysisInput = {
  track: TrackMetadata;
  artist: ArtistMetadata;
  album: AlbumMetadata;
  audioFeatures?: AudioFeatures | null;
  popularity?: number | null;
  releaseDate?: string | null;
  genreHints: string[];
  question: string;
  mode: AnalysisMode;
  lyricsContext?: string | null;
  userListeningProfile?: ListeningProfile | null;
  comparisonTrack?: ComparisonTrack | null;
  repairNote?: string | null;
};

export type ModelAnalysisEvidence = {
  claim: string;
  source_field: string;
  support_level: "strong" | "medium" | "weak";
};

export type ModelAnalysisResult = {
  summary: string;
  emotional_profile: string[];
  genre_hypothesis: string[];
  production_notes: string[];
  listener_match_reasons: string[];
  virality_factors: string[];
  confidence: number;
  evidence: ModelAnalysisEvidence[];
  limitations: string[];
  recommended_visualization: string;
  raw_text?: string;
};

export type ModelAnalysisRun = {
  id: string;
  mode: AnalysisMode;
  question: string;
  track: TrackMetadata;
  providerCount: number;
  summary: ComparisonSummary;
  createdAt: string;
  outputs: ModelBattleOutput[];
};

export type ModelBattleOutput = {
  providerKey: ProviderKey;
  providerName: string;
  model: string;
  latencyMs: number;
  outputLength: number;
  estimatedTokens: number;
  parsed: ModelAnalysisResult;
  rawText: string;
  evaluation: EvaluationScore;
  similarityScore: number;
  hallucinationRisk: number;
  retryCount: number;
};

export type EvaluationScore = {
  jsonValidity: number;
  evidenceCoverage: number;
  factualGrounding: number;
  specificity: number;
  usefulness: number;
  hallucinationRisk: number;
  consistencyWithAudioFeatures: number;
  clarity: number;
  uniqueness: number;
  overall: number;
};

export type ComparisonSummary = {
  agreesOn: string[];
  disagreesOn: string[];
  mostCreativeModel: string;
  mostGroundedModel: string;
  mostCautiousModel: string;
  bestOverallAnswer: string;
  similarityMatrix: Array<{
    left: string;
    right: string;
    score: number;
  }>;
};

export type ProviderAvailability = {
  key: ProviderKey;
  label: string;
  enabled: boolean;
  model: string;
  reason?: string;
};

export type AnalysisHistoryRow = {
  id: string;
  createdAt: string;
  mode: AnalysisMode;
  trackName: string;
  artistName: string;
  bestOverallAnswer: string;
  providerCount: number;
  averageConfidence: number;
  averageHallucinationRisk: number;
  summary: string;
};
