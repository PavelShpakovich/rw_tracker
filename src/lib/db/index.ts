import { PGlite } from "@electric-sql/pglite";
import { drizzle as pgliteDrizzle } from "drizzle-orm/pglite";
import { drizzle as postgresDrizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../env";
import * as schema from "./schema";

function createDb() {
  const url = env.DATABASE_URL;
  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
    const client = postgres(url, { prepare: false, max: 5 });
    return postgresDrizzle(client, { schema });
  }
  // pglite — local/test
  const dataDir = url.startsWith("pglite:") ? url.slice("pglite:".length) : url;
  const client = new PGlite(dataDir === "memory" ? undefined : dataDir);
  return pgliteDrizzle(client, { schema });
}

type Db = ReturnType<typeof createDb>;

declare global {
  var __rwDb: Db | undefined;
}

export const db = (globalThis.__rwDb ??= createDb());
