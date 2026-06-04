import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const DEFAULT_HISTORY_DIR = "data/spotify-history";
const DEFAULT_USER_ID = "me";
const POSTGRES_CONTAINER = "ai-music-xray-postgres";

const historyDir = process.argv[2] ?? DEFAULT_HISTORY_DIR;
const userId = process.env.SPOTIFY_IMPORT_USER_ID ?? DEFAULT_USER_ID;
const schemaSql = await fs.readFile("db/001_music_revival.sql", "utf8");

const files = await findJsonFiles(historyDir);
if (files.length === 0) {
  console.error(`No JSON files found in ${historyDir}.`);
  console.error("Put Spotify Extended Streaming History files there, or pass a directory path.");
  process.exit(1);
}

const artists = new Map();
const tracks = new Map();
const trackArtists = new Map();
const events = new Map();

for (const file of files) {
  const raw = await fs.readFile(file, "utf8");
  const parsed = JSON.parse(raw);
  const rows = Array.isArray(parsed) ? parsed : parsed.items;
  if (!Array.isArray(rows)) continue;

  for (const row of rows) {
    const event = normalizeRow(row);
    if (!event) continue;

    artists.set(event.artistId, {
      id: event.artistId,
      name: event.artistName
    });

    tracks.set(event.trackId, {
      id: event.trackId,
      name: event.trackName,
      primaryArtistId: event.artistId,
      albumName: event.albumName,
      durationMs: event.durationMs
    });

    trackArtists.set(`${event.trackId}\t${event.artistId}`, {
      trackId: event.trackId,
      artistId: event.artistId
    });

    events.set(`${userId}\t${event.trackId}\t${event.playedAt}`, {
      userId,
      trackId: event.trackId,
      playedAt: event.playedAt,
      msPlayed: event.msPlayed
    });
  }
}

if (events.size === 0) {
  console.error("No playable Spotify history rows were found.");
  process.exit(1);
}

const sql = buildImportSql({
  userId,
  artists: Array.from(artists.values()),
  tracks: Array.from(tracks.values()),
  trackArtists: Array.from(trackArtists.values()),
  events: Array.from(events.values())
});

const result = spawnSync(
  "docker",
  ["exec", "-i", POSTGRES_CONTAINER, "psql", "-U", "ai_music_xray", "-d", "ai_music_xray", "-v", "ON_ERROR_STOP=1"],
  { input: sql, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
);

if (result.status !== 0) {
  console.error(result.stderr || result.stdout);
  console.error(`Import failed. Is ${POSTGRES_CONTAINER} running? Try: docker compose up -d postgres`);
  process.exit(result.status ?? 1);
}

console.log(result.stdout.trim());
console.log(
  `Imported ${events.size} listening events, ${tracks.size} tracks, and ${artists.size} artists for user "${userId}".`
);

async function findJsonFiles(dir) {
  const absoluteDir = path.resolve(dir);
  const entries = await fs.readdir(absoluteDir, { withFileTypes: true }).catch(() => []);
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(absoluteDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findJsonFiles(entryPath)));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".json")) {
      files.push(entryPath);
    }
  }

  return files.sort();
}

function normalizeRow(row) {
  const playedAt = parsePlayedAt(row);
  const trackName = row.master_metadata_track_name ?? row.trackName;
  const artistName = row.master_metadata_album_artist_name ?? row.artistName;
  const albumName = row.master_metadata_album_album_name ?? null;
  const msPlayed = Number(row.ms_played ?? row.msPlayed ?? 0) || null;

  if (!playedAt || !trackName || !artistName) return null;
  if (msPlayed !== null && msPlayed < 30_000) return null;

  const trackId = spotifyIdFromUri(row.spotify_track_uri) ?? fallbackId("track", `${artistName}|${trackName}`);
  const artistId = fallbackId("artist", artistName);

  return {
    playedAt,
    trackId,
    trackName,
    artistId,
    artistName,
    albumName,
    durationMs: null,
    msPlayed
  };
}

function parsePlayedAt(row) {
  if (row.ts) return isoDateOrNull(row.ts);
  if (row.endTime) {
    const normalized = row.endTime.includes("T") ? row.endTime : row.endTime.replace(" ", "T") + ":00Z";
    return isoDateOrNull(normalized);
  }
  return null;
}

function isoDateOrNull(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function spotifyIdFromUri(uri) {
  if (typeof uri !== "string") return null;
  const match = uri.match(/^spotify:track:([A-Za-z0-9]+)$/);
  return match?.[1] ?? null;
}

function fallbackId(type, value) {
  return `local:${type}:${crypto.createHash("sha1").update(value.toLowerCase()).digest("hex").slice(0, 16)}`;
}

function buildImportSql({ userId, artists, tracks, trackArtists, events }) {
  return `
${schemaSql}

begin;

insert into spotify_users (id, display_name)
values (${sqlString(userId)}, ${sqlString(userId)})
on conflict (id) do update set display_name = excluded.display_name;

${copySql("spotify_artists", ["id", "name"], artists.map((artist) => [artist.id, artist.name]))}

${copySql(
  "spotify_tracks",
  ["id", "name", "primary_artist_id", "album_name", "duration_ms"],
  tracks.map((track) => [track.id, track.name, track.primaryArtistId, track.albumName, track.durationMs])
)}

${copySql(
  "spotify_track_artists",
  ["track_id", "artist_id", "artist_order"],
  trackArtists.map((edge) => [edge.trackId, edge.artistId, 0])
)}

${copySql(
  "spotify_listening_events",
  ["user_id", "track_id", "played_at", "source", "ms_played"],
  events.map((event) => [event.userId, event.trackId, event.playedAt, "spotify_extended_history", event.msPlayed])
)}

refresh materialized view analytics_track_revival_metrics;
refresh materialized view analytics_artist_revival_metrics;

commit;
`;
}

function copySql(table, columns, rows) {
  if (rows.length === 0) return "";

  const tempTable = `incoming_${table}`;
  const columnList = columns.join(", ");

  return `
create temporary table ${tempTable} (like ${table} including defaults) on commit drop;
copy ${tempTable} (${columnList}) from stdin with (format csv);
${rows.map(csvRow).join("\n")}
\\.
insert into ${table} (${columnList})
select ${columnList} from ${tempTable}
on conflict do nothing;
`;
}

function csvRow(values) {
  return values.map(csvValue).join(",");
}

function csvValue(value) {
  if (value === null || value === undefined) return "";
  return `"${String(value).replaceAll('"', '""')}"`;
}

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}
