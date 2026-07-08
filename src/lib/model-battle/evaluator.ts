import { comparisonSummarySchema } from "./schema";
import type {
  ComparisonSummary,
  EvaluationScore,
  ModelAnalysisResult,
  ModelBattleOutput,
  TrackAnalysisInput
} from "./types";

export function evaluateModelOutput(input: TrackAnalysisInput, output: ModelAnalysisResult): EvaluationScore {
  const evidenceCoverage = scoreEvidenceCoverage(input, output);
  const factualGrounding = scoreGrounding(input, output);
  const specificity = scoreSpecificity(output);
  const usefulness = scoreUsefulness(output);
  const consistencyWithAudioFeatures = scoreAudioConsistency(input, output);
  const clarity = scoreClarity(output);
  const uniqueness = scoreUniqueness(output);
  const jsonValidity = output.summary?.trim() ? 100 : 0;
  const hallucinationRisk = clampPercent(
    100 -
      (0.22 * evidenceCoverage +
        0.2 * factualGrounding +
        0.12 * specificity +
        0.12 * usefulness +
        0.12 * consistencyWithAudioFeatures +
        0.1 * clarity +
        0.12 * jsonValidity)
  );
  const overall = clampPercent(
    0.18 * jsonValidity +
      0.2 * evidenceCoverage +
      0.18 * factualGrounding +
      0.12 * specificity +
      0.12 * usefulness +
      0.08 * consistencyWithAudioFeatures +
      0.06 * clarity +
      0.06 * uniqueness -
      hallucinationRisk * 0.04
  );

  return {
    jsonValidity,
    evidenceCoverage,
    factualGrounding,
    specificity,
    usefulness,
    hallucinationRisk,
    consistencyWithAudioFeatures,
    clarity,
    uniqueness,
    overall
  };
}

export function buildComparisonSummary(outputs: ModelBattleOutput[]): ComparisonSummary {
  const ordered = [...outputs].sort((left, right) => right.evaluation.overall - left.evaluation.overall);
  const keywordSets = outputs.map((output) => keywordsFor(output.parsed));
  const sharedKeywords = intersectKeywordSets(keywordSets);
  const divergentKeywords = symmetricDifference(keywordSets);
  const similarityMatrix = buildSimilarityMatrix(outputs);

  return comparisonSummarySchema.parse({
    agreesOn: Array.from(sharedKeywords).slice(0, 5),
    disagreesOn: Array.from(divergentKeywords).slice(0, 5),
    mostCreativeModel: pickBy(outputs, (output) => output.evaluation.uniqueness + output.evaluation.specificity),
    mostGroundedModel: pickBy(outputs, (output) => output.evaluation.factualGrounding + output.evaluation.evidenceCoverage),
    mostCautiousModel: pickBy(outputs, (output) => 100 - output.hallucinationRisk + countLimitations(output.parsed)),
    bestOverallAnswer: ordered[0]?.providerName ?? "N/A",
    similarityMatrix
  });
}

export function enrichOutputSimilarity(outputs: ModelBattleOutput[]) {
  const matrix = buildSimilarityMatrix(outputs);
  return outputs.map((output) => {
    const related = matrix
      .filter((entry) => entry.left === output.providerName || entry.right === output.providerName)
      .map((entry) => entry.score);
    const similarityScore = related.length ? related.reduce((sum, value) => sum + value, 0) / related.length : 100;
    return { ...output, similarityScore: Math.round(similarityScore) };
  });
}

function scoreEvidenceCoverage(input: TrackAnalysisInput, output: ModelAnalysisResult) {
  const expectedFields = [
    "track.name",
    "track.artistName",
    "album.name",
    "audioFeatures",
    "genreHints",
    input.lyricsContext ? "lyricsContext" : null
  ].filter(Boolean) as string[];
  const evidenceFields = new Set(output.evidence.map((entry) => entry.source_field.toLowerCase()));
  const covered = expectedFields.filter((field) => {
    if (field === "audioFeatures") return evidenceFields.has("audiofeatures.tempo + energy + valence") || evidenceFields.has("audiofeatures");
    if (field === "genreHints") return evidenceFields.has("genrehints");
    if (field === "lyricsContext") return evidenceFields.has("lyricscontext");
    return evidenceFields.has(field);
  }).length;
  return pct(covered / expectedFields.length);
}

function scoreGrounding(input: TrackAnalysisInput, output: ModelAnalysisResult) {
  let score = 0.52;
  const lowerSummary = output.summary.toLowerCase();
  if (lowerSummary.includes(input.track.name.toLowerCase())) score += 0.12;
  if (lowerSummary.includes(input.track.artistName.toLowerCase())) score += 0.12;
  if (output.evidence.some((entry) => entry.support_level === "strong")) score += 0.1;
  if (!input.lyricsContext && output.summary.toLowerCase().includes("lyrics")) score -= 0.15;
  if (input.audioFeatures?.tempo != null && lowerSummary.includes(String(Math.round(input.audioFeatures.tempo)))) score += 0.08;
  return pct(score);
}

function scoreSpecificity(output: ModelAnalysisResult) {
  const lengthScore = Math.min(1, output.summary.length / 220);
  const listScore =
    (output.emotional_profile.length + output.genre_hypothesis.length + output.production_notes.length + output.listener_match_reasons.length) /
    16;
  return pct(0.45 * lengthScore + 0.55 * listScore);
}

function scoreUsefulness(output: ModelAnalysisResult) {
  const limitationsBonus = output.limitations.length ? 0.18 : -0.05;
  const evidenceBonus = Math.min(0.2, output.evidence.length * 0.05);
  const summaryBonus = Math.min(0.6, output.summary.length / 250);
  return pct(0.42 + limitationsBonus + evidenceBonus + summaryBonus);
}

function scoreAudioConsistency(input: TrackAnalysisInput, output: ModelAnalysisResult) {
  const tempo = input.audioFeatures?.tempo;
  let score = 0.52;
  if (tempo != null) {
    if (tempo >= 120 && hasAny(output.production_notes, ["fast", "upbeat", "kinetic", "forward motion"])) score += 0.16;
    if (tempo < 95 && hasAny(output.production_notes, ["unhurried", "space", "intimate"])) score += 0.12;
  }
  if (input.audioFeatures?.energy != null && input.audioFeatures.energy > 0.7 && hasAny(output.virality_factors, ["energy", "replayability"])) score += 0.12;
  if (input.audioFeatures?.acousticness != null && input.audioFeatures.acousticness > 0.5 && hasAny(output.production_notes, ["acoustic", "organic"])) score += 0.1;
  return pct(score);
}

function scoreClarity(output: ModelAnalysisResult) {
  const sentenceCount = splitSentences(output.summary).length;
  const brevity = output.summary.length < 220 ? 0.16 : 0.06;
  const hasStructure = output.evidence.length > 0 && output.limitations.length > 0 ? 0.18 : 0.05;
  return pct(0.48 + brevity + hasStructure + Math.min(0.18, sentenceCount * 0.03));
}

function scoreUniqueness(output: ModelAnalysisResult) {
  const diversity = new Set([
    ...output.emotional_profile,
    ...output.genre_hypothesis,
    ...output.production_notes,
    ...output.listener_match_reasons
  ]).size;
  return pct(Math.min(1, diversity / 14));
}

function buildSimilarityMatrix(outputs: ModelBattleOutput[]) {
  return outputs.flatMap((left, leftIndex) =>
    outputs.slice(leftIndex + 1).map((right) => ({
      left: left.providerName,
      right: right.providerName,
      score: jaccard([...keywordsFor(left.parsed), ...keywordsFor(right.parsed)])
    }))
  );
}

function keywordsFor(result: ModelAnalysisResult) {
  return [
    ...result.emotional_profile,
    ...result.genre_hypothesis,
    ...result.production_notes,
    ...result.listener_match_reasons,
    ...result.virality_factors
  ].flatMap((item) => item.toLowerCase().split(/[^a-z0-9]+/g)).filter((value) => value.length > 2);
}

function intersectKeywordSets(outputs: string[][]) {
  if (!outputs.length) return new Set<string>();
  const [first, ...rest] = outputs.map((output) => new Set(output));
  return rest.reduce((accumulator, current) => {
    const next = new Set<string>();
    for (const value of accumulator) {
      if (current.has(value)) next.add(value);
    }
    return next;
  }, first);
}

function symmetricDifference(outputs: string[][]) {
  const counts = new Map<string, number>();
  for (const output of outputs) {
    for (const keyword of new Set(output)) {
      counts.set(keyword, (counts.get(keyword) ?? 0) + 1);
    }
  }
  return new Set(Array.from(counts.entries()).filter(([, count]) => count === 1).map(([keyword]) => keyword));
}

function pickBy(outputs: ModelBattleOutput[], scoreFn: (output: ModelBattleOutput) => number) {
  return outputs.reduce((best, current) => (best == null || scoreFn(current) > scoreFn(best) ? current : best), outputs[0])?.providerName ?? "N/A";
}

function countLimitations(result: ModelAnalysisResult) {
  return result.limitations.length;
}

function hasAny(values: string[], keywords: string[]) {
  const haystack = values.join(" ").toLowerCase();
  return keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
}

function splitSentences(value: string) {
  return value.split(/[.!?]+/).map((part) => part.trim()).filter(Boolean);
}

function jaccard(values: string[]) {
  const normalized = values.filter((value) => value.length > 2);
  const unique = new Set(normalized);
  if (!unique.size) return 0;
  return Math.min(100, Math.round((unique.size / Math.max(1, normalized.length)) * 100));
}

function pct(value: number) {
  return Math.round(clamp(value) * 100);
}

function clampPercent(value: number) {
  return Math.round(Math.max(0, Math.min(100, value)));
}

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}
