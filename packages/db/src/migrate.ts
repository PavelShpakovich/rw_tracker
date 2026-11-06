import { migrate as pgliteMigrate } from "drizzle-orm/pglite/migrator";
import { migrate as postgresMigrate } from "drizzle-orm/postgres-js/migrator";
import { fileURLToPath } from "node:url";
import { db, usesPostgres } from "./client";

const migrationsFolder = fileURLToPath(new URL("../drizzle", import.meta.url));

export async function runMigrations() {
  if (usesPostgres) {
    await postgresMigrate(db as Parameters<typeof postgresMigrate>[0], { migrationsFolder });
  } else {
    await pgliteMigrate(db as Parameters<typeof pgliteMigrate>[0], { migrationsFolder });
  }
}
