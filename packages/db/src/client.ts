import { PGlite } from "@electric-sql/pglite";
import { drizzle as pgliteDrizzle } from "drizzle-orm/pglite";
import { drizzle as postgresDrizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { isSupabaseDatabaseUrl } from "./database-url";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required. Set it to the Supabase PostgreSQL connection string.",
  );
}
const connectionString: string = databaseUrl;

const isTestPglite =
  process.env.NODE_ENV === "test" && connectionString === "pglite:memory";
const usesPostgres = isSupabaseDatabaseUrl(connectionString);
if (!isTestPglite && !usesPostgres) {
  throw new Error(
    "DATABASE_URL must point to a Supabase PostgreSQL host. PGlite is only allowed in in-memory tests.",
  );
}

export { usesPostgres };

function createDb() {
  if (isTestPglite) {
    const client = new PGlite();
    return pgliteDrizzle(client, { schema });
  }

  const client = postgres(connectionString, { prepare: false, max: 5 });
  return postgresDrizzle(client, { schema });
}

type Db = ReturnType<typeof createDb>;

declare global {
  var __rwDb: Db | undefined;
}

export const db = (globalThis.__rwDb ??= createDb());
