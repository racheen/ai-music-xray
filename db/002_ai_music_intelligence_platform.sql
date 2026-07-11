CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS track_snapshots (
  track_id TEXT PRIMARY KEY,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analysis_runs (
  id UUID PRIMARY KEY,
  mode TEXT NOT NULL,
  track_id TEXT NOT NULL,
  track_name TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  question TEXT NOT NULL,
  input_snapshot JSONB NOT NULL,
  comparison_summary JSONB NOT NULL,
  provider_count INTEGER NOT NULL DEFAULT 0,
  best_overall_answer TEXT NOT NULL,
  average_confidence NUMERIC(5,4) NOT NULL DEFAULT 0,
  average_hallucination_risk NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS analysis_runs_created_at_idx ON analysis_runs (created_at DESC);
CREATE INDEX IF NOT EXISTS analysis_runs_track_name_idx ON analysis_runs (track_name);
CREATE INDEX IF NOT EXISTS analysis_runs_artist_name_idx ON analysis_runs (artist_name);
CREATE INDEX IF NOT EXISTS analysis_runs_mode_idx ON analysis_runs (mode);

CREATE TABLE IF NOT EXISTS model_outputs (
  id UUID PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES analysis_runs(id) ON DELETE CASCADE,
  provider_key TEXT NOT NULL,
  provider_name TEXT NOT NULL,
  model TEXT NOT NULL,
  raw_output TEXT NOT NULL,
  parsed_output JSONB NOT NULL,
  evaluation_score JSONB NOT NULL,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  output_length INTEGER NOT NULL DEFAULT 0,
  estimated_tokens INTEGER NOT NULL DEFAULT 0,
  similarity_score INTEGER NOT NULL DEFAULT 0,
  hallucination_risk INTEGER NOT NULL DEFAULT 0,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS model_outputs_run_id_idx ON model_outputs (run_id);
CREATE INDEX IF NOT EXISTS model_outputs_provider_key_idx ON model_outputs (provider_key);

CREATE TABLE IF NOT EXISTS evaluation_scores (
  id UUID PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES analysis_runs(id) ON DELETE CASCADE,
  provider_key TEXT NOT NULL,
  provider_name TEXT NOT NULL,
  json_validity INTEGER NOT NULL DEFAULT 0,
  evidence_coverage INTEGER NOT NULL DEFAULT 0,
  factual_grounding INTEGER NOT NULL DEFAULT 0,
  specificity INTEGER NOT NULL DEFAULT 0,
  usefulness INTEGER NOT NULL DEFAULT 0,
  hallucination_risk INTEGER NOT NULL DEFAULT 0,
  consistency_with_audio_features INTEGER NOT NULL DEFAULT 0,
  clarity INTEGER NOT NULL DEFAULT 0,
  uniqueness INTEGER NOT NULL DEFAULT 0,
  overall INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS evaluation_scores_run_id_idx ON evaluation_scores (run_id);

CREATE TABLE IF NOT EXISTS provider_logs (
  id UUID PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES analysis_runs(id) ON DELETE CASCADE,
  provider_key TEXT NOT NULL,
  provider_name TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  request_snapshot JSONB NOT NULL,
  response_snapshot JSONB NOT NULL,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS provider_logs_run_id_idx ON provider_logs (run_id);
CREATE INDEX IF NOT EXISTS provider_logs_provider_key_idx ON provider_logs (provider_key);
