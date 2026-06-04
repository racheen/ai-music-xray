export type RevivalEntityType = "track" | "artist";

export type ListeningEvent = {
  playedAt: string;
  trackId: string;
  trackName?: string;
  artistId?: string;
  artistName?: string;
  genres?: string[];
};

export type RevivalPeriod = {
  start: string;
  end: string;
  playCount: number;
};

export type RevivalEvent = {
  dormantDays: number;
  comebackAt: string;
  comebackPeriod: RevivalPeriod;
  score: number;
};

export type RevivalMetric = {
  entityType: RevivalEntityType;
  entityId: string;
  entityName: string;
  totalPlays: number;
  firstPlayedAt: string;
  lastPlayedAt: string;
  firstEra: RevivalPeriod;
  currentRelevance: number;
  revivalScore: number;
  revivalEvents: RevivalEvent[];
  status: "never_left" | "revived" | "dormant" | "new";
};

export type RevivalAnalysisOptions = {
  entityType?: RevivalEntityType;
  dormantThresholdDays?: number;
  comebackWindowDays?: number;
  currentWindowDays?: number;
  minimumEraPlays?: number;
  now?: string;
};

type EntityPlay = {
  entityType: RevivalEntityType;
  entityId: string;
  entityName: string;
  playedAt: Date;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function analyzeRevival(
  events: ListeningEvent[],
  options: RevivalAnalysisOptions = {}
): RevivalMetric[] {
  const entityType = options.entityType ?? "track";
  const dormantThresholdDays = options.dormantThresholdDays ?? 180;
  const comebackWindowDays = options.comebackWindowDays ?? 90;
  const currentWindowDays = options.currentWindowDays ?? 90;
  const minimumEraPlays = options.minimumEraPlays ?? 2;
  const now = options.now ? new Date(options.now) : new Date();

  const playsByEntity = new Map<string, EntityPlay[]>();
  for (const event of events) {
    const play = toEntityPlay(event, entityType);
    if (!play) continue;

    const key = `${play.entityType}:${play.entityId}`;
    const plays = playsByEntity.get(key) ?? [];
    plays.push(play);
    playsByEntity.set(key, plays);
  }

  return Array.from(playsByEntity.values())
    .map((plays) =>
      scoreEntity(plays, {
        dormantThresholdDays,
        comebackWindowDays,
        currentWindowDays,
        minimumEraPlays,
        now
      })
    )
    .sort((left, right) => right.revivalScore - left.revivalScore || right.totalPlays - left.totalPlays);
}

function toEntityPlay(event: ListeningEvent, entityType: RevivalEntityType): EntityPlay | null {
  const playedAt = new Date(event.playedAt);
  if (Number.isNaN(playedAt.getTime())) return null;

  if (entityType === "artist") {
    if (!event.artistId && !event.artistName) return null;
    return {
      entityType,
      entityId: event.artistId ?? `artist:${event.artistName}`,
      entityName: event.artistName ?? event.artistId ?? "Unknown artist",
      playedAt
    };
  }

  if (!event.trackId) return null;
  return {
    entityType,
    entityId: event.trackId,
    entityName: event.trackName ?? event.trackId,
    playedAt
  };
}

function scoreEntity(
  unsortedPlays: EntityPlay[],
  options: Required<Omit<RevivalAnalysisOptions, "entityType" | "now">> & { now: Date }
): RevivalMetric {
  const plays = [...unsortedPlays].sort((left, right) => left.playedAt.getTime() - right.playedAt.getTime());
  const firstPlayedAt = plays[0].playedAt;
  const lastPlayedAt = plays[plays.length - 1].playedAt;
  const eras = buildEras(plays, options.dormantThresholdDays, options.minimumEraPlays);
  const firstEra = eras[0] ?? periodFromPlays(plays);
  const revivalEvents = buildRevivalEvents(plays, options);
  const currentWindowStart = new Date(options.now.getTime() - options.currentWindowDays * DAY_MS);
  const currentPlayCount = plays.filter((play) => play.playedAt >= currentWindowStart).length;
  const currentRelevance = roundScore(Math.min(1, currentPlayCount / Math.max(3, plays.length)));
  const revivalScore = roundScore(Math.max(0, ...revivalEvents.map((event) => event.score)));

  return {
    entityType: plays[0].entityType,
    entityId: plays[0].entityId,
    entityName: plays[0].entityName,
    totalPlays: plays.length,
    firstPlayedAt: firstPlayedAt.toISOString(),
    lastPlayedAt: lastPlayedAt.toISOString(),
    firstEra,
    currentRelevance,
    revivalScore,
    revivalEvents,
    status: getStatus({ plays, revivalEvents, currentPlayCount, currentWindowStart, firstPlayedAt })
  };
}

function buildEras(plays: EntityPlay[], dormantThresholdDays: number, minimumEraPlays: number): RevivalPeriod[] {
  const eras: EntityPlay[][] = [];
  let currentEra: EntityPlay[] = [];

  for (const play of plays) {
    const previous = currentEra[currentEra.length - 1];
    if (previous && daysBetween(previous.playedAt, play.playedAt) >= dormantThresholdDays) {
      eras.push(currentEra);
      currentEra = [];
    }
    currentEra.push(play);
  }

  if (currentEra.length) eras.push(currentEra);
  return eras.filter((era) => era.length >= minimumEraPlays).map(periodFromPlays);
}

function buildRevivalEvents(
  plays: EntityPlay[],
  options: Required<Omit<RevivalAnalysisOptions, "entityType" | "now">> & { now: Date }
): RevivalEvent[] {
  const events: RevivalEvent[] = [];

  for (let index = 1; index < plays.length; index += 1) {
    const previous = plays[index - 1];
    const comeback = plays[index];
    const dormantDays = daysBetween(previous.playedAt, comeback.playedAt);
    if (dormantDays < options.dormantThresholdDays) continue;

    const previousEraStart = new Date(previous.playedAt.getTime() - options.comebackWindowDays * DAY_MS);
    const comebackWindowEnd = new Date(comeback.playedAt.getTime() + options.comebackWindowDays * DAY_MS);
    const previousEraPlays = plays.filter(
      (play) => play.playedAt >= previousEraStart && play.playedAt <= previous.playedAt
    ).length;
    const comebackPlays = plays.filter(
      (play) => play.playedAt >= comeback.playedAt && play.playedAt <= comebackWindowEnd
    );

    const dormantFactor = Math.min(dormantDays / 365, 3) / 3;
    const comebackDensity = Math.min(comebackPlays.length / Math.max(options.minimumEraPlays, 6), 1);
    const familiarity = Math.min(previousEraPlays / Math.max(options.minimumEraPlays, 6), 1);
    const score = roundScore((0.4 * dormantFactor + 0.4 * comebackDensity + 0.2 * familiarity) * 100);

    events.push({
      dormantDays,
      comebackAt: comeback.playedAt.toISOString(),
      comebackPeriod: periodFromPlays(comebackPlays),
      score
    });
  }

  return events.sort((left, right) => right.score - left.score);
}

function periodFromPlays(plays: EntityPlay[]): RevivalPeriod {
  return {
    start: plays[0].playedAt.toISOString(),
    end: plays[plays.length - 1].playedAt.toISOString(),
    playCount: plays.length
  };
}

function getStatus(input: {
  plays: EntityPlay[];
  revivalEvents: RevivalEvent[];
  currentPlayCount: number;
  currentWindowStart: Date;
  firstPlayedAt: Date;
}): RevivalMetric["status"] {
  if (daysBetween(input.firstPlayedAt, input.currentWindowStart) < 0) return "new";
  if (input.revivalEvents.length > 0) return "revived";
  if (input.currentPlayCount === 0) return "dormant";
  return "never_left";
}

function daysBetween(left: Date, right: Date) {
  return Math.floor((right.getTime() - left.getTime()) / DAY_MS);
}

function roundScore(value: number) {
  return Math.round(value * 100) / 100;
}
