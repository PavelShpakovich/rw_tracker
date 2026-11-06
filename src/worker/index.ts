import { migrate as pgliteMigrate } from "drizzle-orm/pglite/migrator";
import { migrate as postgresMigrate } from "drizzle-orm/postgres-js/migrator";
import path from "node:path";
import { db } from "../lib/db";
import { env } from "../lib/env";
import { log } from "../lib/log";
import { acquireLease, processRouteSearches, releaseLease, runTick } from "./scheduler";

const TICK_MS = 30_000;
const SEARCH_INTERVAL_MS = 2_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function applyMigrations() {
  const migrationsFolder = path.resolve(process.cwd(), "drizzle");
  const url = env.DATABASE_URL;
  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
    await postgresMigrate(db as Parameters<typeof postgresMigrate>[0], { migrationsFolder });
  } else {
    await pgliteMigrate(db as Parameters<typeof pgliteMigrate>[0], { migrationsFolder });
  }
}

async function main() {
  await applyMigrations();

  if (process.argv.includes("--once")) {
    await runTick();
    return;
  }

  let running = true;
  const stop = async () => {
    running = false;
    await releaseLease();
    process.exit(0);
  };
  process.once("SIGINT", () => void stop());
  process.once("SIGTERM", () => void stop());

  log.info(`Worker started (${env.DATABASE_URL.startsWith("postgres") ? "postgres" : "pglite"}), checking every ${TICK_MS / 1000}s`);

  let lastTick = 0;
  let lastSearch = 0;

  for (;;) {
    if (!running) break;

    const now = Date.now();
    const hasLease = await acquireLease();

    if (!hasLease) {
      log.info("Another worker holds the lease, standing by");
      await sleep(TICK_MS);
      continue;
    }

    if (now - lastSearch >= SEARCH_INTERVAL_MS) {
      lastSearch = now;
      try {
        await processRouteSearches();
      } catch (error) {
        log.error("Route search processing failed", String(error));
      }
    }

    if (now - lastTick >= TICK_MS) {
      lastTick = now;
      try {
        await runTick();
      } catch (error) {
        log.error("Tick failed", String(error));
      }
    }

    await sleep(SEARCH_INTERVAL_MS);
  }
}

main().catch((error) => {
  log.error("Worker crashed", error);
  process.exit(1);
});
