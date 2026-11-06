import { PGlite } from "@electric-sql/pglite";
import { drizzle as pgliteDrizzle } from "drizzle-orm/pglite";
import { drizzle as postgresDrizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL ?? "pglite:./data/pg";
export const usesPostgres = databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://");

function createDb() {
  if (usesPostgres) {
    const client = postgres(databaseUrl, { prepare: false, max: 5 });
    return postgresDrizzle(client, { schema });
  }
  // pglite — local/test
  const dataDir = databaseUrl.startsWith("pglite:") ? databaseUrl.slice("pglite:".length) : databaseUrl;
  const client = new PGlite(dataDir === "memory" ? undefined : dataDir);
  return pgliteDrizzle(client, { schema });
}

type Db = ReturnType<typeof createDb>;

declare global {
  var __rwDb: Db | undefined;
}

export const db = (globalThis.__rwDb ??= createDb());
