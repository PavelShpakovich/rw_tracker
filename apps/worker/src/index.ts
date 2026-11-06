import { runMigrations } from "@rw/db/migrate";
import { log } from "./log";
import { acquireLease, processRouteSearches, releaseLease, runTick } from "./scheduler";

const TICK_MS = 30_000;
const SEARCH_INTERVAL_MS = 2_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  await runMigrations();

  if (process.argv.includes("--once")) {
    await runTick();
    process.exit(0);
  }

  let running = true;
  const stop = async () => {
    running = false;
    await releaseLease();
    process.exit(0);
  };
  process.once("SIGINT", () => void stop());
  process.once("SIGTERM", () => void stop());

  log.info(`Worker started, checking every ${TICK_MS / 1000}s`);

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
