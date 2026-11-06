import { log } from "../lib/log";
import { runTick } from "./scheduler";

const TICK_MS = 30_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  if (process.argv.includes("--once")) {
    await runTick();
    return;
  }

  const stop = () => process.exit(0);
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);

  log.info(`Worker started, checking every ${TICK_MS / 1000} s`);
  for (;;) {
    try {
      await runTick();
    } catch (error) {
      log.error("Tick failed", String(error));
    }
    await sleep(TICK_MS);
  }
}

main().catch((error) => {
  log.error("Worker crashed", error);
  process.exit(1);
});
