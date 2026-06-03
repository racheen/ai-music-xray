import type { BeatEvent, StemFrame, TrackAnalysis } from "@/types/music";

export function createFallbackAnalysis(input: {
  trackId: string;
  durationMs?: number;
  tempo?: number;
  popularity?: number;
}): TrackAnalysis {
  const duration = Math.max((input.durationMs ?? 210000) / 1000, 30);
  const tempo = input.tempo ?? tempoFromId(input.trackId, input.popularity);
  const beatDuration = 60 / tempo;
  const beats: BeatEvent[] = [];
  const bars: BeatEvent[] = [];

  for (let t = 0; t < duration; t += beatDuration) {
    const beatIndex = beats.length;
    beats.push({
      start: Number(t.toFixed(3)),
      duration: Number(beatDuration.toFixed(3)),
      confidence: beatIndex % 4 === 0 ? 0.92 : 0.64
    });
  }

  for (let i = 0; i < beats.length; i += 4) {
    bars.push({
      start: beats[i].start,
      duration: Number((beatDuration * 4).toFixed(3)),
      confidence: 0.76
    });
  }

  const sections = Array.from({ length: Math.ceil(duration / 32) }, (_, index) => ({
    start: index * 32,
    duration: Math.min(32, duration - index * 32),
    loudness: -18 + ((index * 7) % 12),
    tempo: tempo + ((index % 3) - 1) * 2
  }));

  return { tempo, beats, bars, sections };
}

export function stemFrameAt(timeSeconds: number, analysis: TrackAnalysis): StemFrame {
  const tempo = analysis.tempo ?? 120;
  const phase = timeSeconds * (tempo / 60);
  const beatPulse = pulse(phase % 1, 0.12);
  const barPulse = pulse((phase / 4) % 1, 0.22);
  const vocalWave = (Math.sin(timeSeconds * 1.7) + Math.sin(timeSeconds * 0.37)) * 0.25 + 0.5;
  const shimmer = (Math.sin(timeSeconds * 3.1 + 2) + 1) / 2;

  return {
    drums: clamp01(beatPulse * 0.9 + barPulse * 0.25),
    bass: clamp01(barPulse * 0.7 + Math.sin(timeSeconds * 2.2) * 0.14 + 0.38),
    vocals: clamp01(vocalWave),
    other: clamp01(shimmer * 0.55 + beatPulse * 0.25)
  };
}

function tempoFromId(trackId: string, popularity = 58) {
  let hash = 0;
  for (const char of trackId) hash = (hash * 31 + char.charCodeAt(0)) % 10000;
  return 82 + ((hash + popularity) % 68);
}

function pulse(position: number, width: number) {
  return Math.exp(-Math.pow(position / width, 2));
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}
