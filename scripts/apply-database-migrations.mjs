import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { Client } from "pg";

const projectRoot = process.cwd();
const migrationFiles = [
  "db/001_music_revival.sql",
  "db/002_ai_music_intelligence_platform.sql"
];

async function main() {
  const databaseUrl = await resolveDatabaseUrl();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is missing. Set it in your shell or .env.local first.");
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    for (const file of migrationFiles) {
      const sqlPath = path.join(projectRoot, file);
      const sql = await fs.readFile(sqlPath, "utf8");
      console.log(`Applying ${file}...`);
      await client.query(sql);
    }
    console.log("Database migrations applied successfully.");
  } finally {
    await client.end();
  }
}

async function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL?.trim()) return process.env.DATABASE_URL.trim();

  for (const file of [".env.local", ".env"]) {
    const envPath = path.join(projectRoot, file);
    try {
      const raw = await fs.readFile(envPath, "utf8");
      const match = raw.match(/^DATABASE_URL\s*=\s*["']?(.+?)["']?\s*$/m);
      if (match?.[1]) return match[1].trim();
    } catch {
      continue;
    }
  }

  return null;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
