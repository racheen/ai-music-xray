import type { AnalysisResponse, AnalysisServicePayload } from "./schema";

export async function analyzeTrackWithService(payload: AnalysisServicePayload): Promise<AnalysisResponse | null> {
  const serviceUrl = process.env.AUDIO_ANALYSIS_API_URL?.trim();
  if (!serviceUrl) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(`${serviceUrl.replace(/\/$/, "")}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: "no-store"
    });

    if (!response.ok) return null;
    return (await response.json()) as AnalysisResponse;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
