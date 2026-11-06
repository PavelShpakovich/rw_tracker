import { migrate as pgliteMigrate } from "drizzle-orm/pglite/migrator";
import { migrate as postgresMigrate } from "drizzle-orm/postgres-js/migrator";
import path from "node:path";
import { db } from "../src/lib/db";
import { env } from "../src/lib/env";

const migrationsFolder = path.resolve(process.cwd(), "drizzle");

async function main() {
  const url = env.DATABASE_URL;
  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
    await postgresMigrate(db as Parameters<typeof postgresMigrate>[0], { migrationsFolder });
  } else {
    await pgliteMigrate(db as Parameters<typeof pgliteMigrate>[0], { migrationsFolder });
  }
  console.log("Migrations applied");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
