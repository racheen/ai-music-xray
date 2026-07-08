import { randomUUID } from "crypto";
import { Pool } from "pg";
import type { AnalysisHistoryRow, ModelAnalysisRun, TrackAnalysisInput } from "./types";

let pool: Pool | null = null;

function getPool() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) return null;
  if (!pool) {
    pool = new Pool({ connectionString });
  }
  return pool;
}

export function isModelBattleDatabaseReady() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export async function saveAnalysisRun(run: ModelAnalysisRun, input: TrackAnalysisInput) {
  const db = getPool();
  if (!db) return;

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO track_snapshots (track_id, snapshot, created_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (track_id) DO UPDATE SET snapshot = EXCLUDED.snapshot, created_at = NOW()`,
      [input.track.id, JSON.stringify(input)]
    );

    await client.query(
      `INSERT INTO analysis_runs (
        id, mode, track_id, track_name, artist_name, question, input_snapshot, comparison_summary,
        provider_count, best_overall_answer, average_confidence, average_hallucination_risk, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10, $11, $12, NOW())`,
      [
        run.id,
        run.mode,
        input.track.id,
        input.track.name,
        input.track.artistName,
        input.question,
        JSON.stringify(input),
        JSON.stringify(run.summary),
        run.providerCount,
        run.summary.bestOverallAnswer,
        average(run.outputs.map((output) => output.parsed.confidence)),
        average(run.outputs.map((output) => output.hallucinationRisk))
      ]
    );

    for (const output of run.outputs) {
      await client.query(
        `INSERT INTO model_outputs (
          id, run_id, provider_key, provider_name, model, raw_output, parsed_output, evaluation_score,
          latency_ms, output_length, estimated_tokens, similarity_score, hallucination_risk, retry_count, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10, $11, $12, $13, $14, NOW())`,
        [
          randomUUID(),
          run.id,
          output.providerKey,
          output.providerName,
          output.model,
          output.rawText,
          JSON.stringify(output.parsed),
          JSON.stringify(output.evaluation),
          output.latencyMs,
          output.outputLength,
          output.estimatedTokens,
          output.similarityScore,
          output.hallucinationRisk,
          output.retryCount
        ]
      );

      await client.query(
        `INSERT INTO evaluation_scores (
          id, run_id, provider_key, provider_name, json_validity, evidence_coverage, factual_grounding,
          specificity, usefulness, hallucination_risk, consistency_with_audio_features, clarity, uniqueness, overall, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())`,
        [
          randomUUID(),
          run.id,
          output.providerKey,
          output.providerName,
          output.evaluation.jsonValidity,
          output.evaluation.evidenceCoverage,
          output.evaluation.factualGrounding,
          output.evaluation.specificity,
          output.evaluation.usefulness,
          output.evaluation.hallucinationRisk,
          output.evaluation.consistencyWithAudioFeatures,
          output.evaluation.clarity,
          output.evaluation.uniqueness,
          output.evaluation.overall
        ]
      );

      await client.query(
        `INSERT INTO provider_logs (
          id, run_id, provider_key, provider_name, model, prompt_version, request_snapshot, response_snapshot, latency_ms, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, NOW())`,
        [
          randomUUID(),
          run.id,
          output.providerKey,
          output.providerName,
          output.model,
          "v1",
          JSON.stringify({ input }),
          JSON.stringify({ rawText: output.rawText, parsed: output.parsed })
        ]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listAnalysisRuns(limit = 20): Promise<AnalysisHistoryRow[]> {
  const db = getPool();
  if (!db) return [];

  const result = await db.query(
    `SELECT id, created_at, mode, track_name, artist_name, best_overall_answer, provider_count, average_confidence, average_hallucination_risk,
            COALESCE((comparison_summary->>'bestOverallAnswer'), best_overall_answer) AS summary
     FROM analysis_runs
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit]
  );

  return result.rows.map((row) => ({
    id: row.id,
    createdAt: new Date(row.created_at).toISOString(),
    mode: row.mode,
    trackName: row.track_name,
    artistName: row.artist_name,
    bestOverallAnswer: row.best_overall_answer,
    providerCount: Number(row.provider_count),
    averageConfidence: Number(row.average_confidence),
    averageHallucinationRisk: Number(row.average_hallucination_risk),
    summary: row.summary ?? row.best_overall_answer
  }));
}

export async function getAnalysisRunById(id: string): Promise<ModelAnalysisRun | null> {
  const db = getPool();
  if (!db) return null;

  const runResult = await db.query(
    `SELECT id, mode, question, track_id, track_name, artist_name, input_snapshot, comparison_summary, provider_count, created_at
     FROM analysis_runs
     WHERE id = $1
     LIMIT 1`,
    [id]
  );

  if (!runResult.rowCount) return null;

  const runRow = runResult.rows[0];
  const outputsResult = await db.query(
    `SELECT provider_key, provider_name, model, raw_output, parsed_output, evaluation_score, latency_ms, output_length, estimated_tokens, similarity_score, hallucination_risk, retry_count
     FROM model_outputs
     WHERE run_id = $1
     ORDER BY created_at ASC`,
    [id]
  );

  const inputSnapshot = runRow.input_snapshot ?? {};
  const comparisonSummary = runRow.comparison_summary ?? {};
  return {
    id: runRow.id,
    mode: runRow.mode,
    question: runRow.question,
    track: {
      id: runRow.track_id,
      name: runRow.track_name,
      artistName: runRow.artist_name,
      albumName: inputSnapshot.album?.name ?? "",
      albumArt: inputSnapshot.track?.albumArt ?? null,
      durationMs: inputSnapshot.track?.durationMs ?? 0,
      previewUrl: inputSnapshot.track?.previewUrl ?? null,
      spotifyUrl: inputSnapshot.track?.spotifyUrl ?? null,
      explicit: inputSnapshot.track?.explicit ?? false,
      artistId: inputSnapshot.track?.artistId,
      albumId: inputSnapshot.track?.albumId
    },
    providerCount: Number(runRow.provider_count),
    summary: {
      agreesOn: comparisonSummary.agreesOn ?? [],
      disagreesOn: comparisonSummary.disagreesOn ?? [],
      mostCreativeModel: comparisonSummary.mostCreativeModel ?? "N/A",
      mostGroundedModel: comparisonSummary.mostGroundedModel ?? "N/A",
      mostCautiousModel: comparisonSummary.mostCautiousModel ?? "N/A",
      bestOverallAnswer: comparisonSummary.bestOverallAnswer ?? "N/A",
      similarityMatrix: comparisonSummary.similarityMatrix ?? []
    },
    createdAt: new Date(runRow.created_at).toISOString(),
    outputs: outputsResult.rows.map((row) => ({
      providerKey: row.provider_key,
      providerName: row.provider_name,
      model: row.model,
      latencyMs: Number(row.latency_ms),
      outputLength: Number(row.output_length),
      estimatedTokens: Number(row.estimated_tokens),
      parsed: row.parsed_output,
      rawText: row.raw_output,
      evaluation: row.evaluation_score,
      similarityScore: Number(row.similarity_score),
      hallucinationRisk: Number(row.hallucination_risk),
      retryCount: Number(row.retry_count)
    }))
  };
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
