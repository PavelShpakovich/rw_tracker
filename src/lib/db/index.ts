import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { env } from "../env";
import * as schema from "./schema";

function createDb() {
  const file = path.resolve(/*turbopackIgnore: true*/ process.cwd(), env.DATABASE_PATH);
  fs.mkdirSync(path.dirname(file), { recursive: true });

  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("foreign_keys = ON");

  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.resolve(/*turbopackIgnore: true*/ process.cwd(), "drizzle") });
  return db;
}

// Shared across hot reloads of the Next.js dev server.
declare global {
  var __rwDb: ReturnType<typeof createDb> | undefined;
}

export const db = (globalThis.__rwDb ??= createDb());
