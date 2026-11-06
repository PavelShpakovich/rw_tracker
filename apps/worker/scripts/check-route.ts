import { fetchRouteHtml } from "../src/rw/client";
import { parseRoute } from "../src/rw/parser";

function readArg(name: string): string {
  const index = process.argv.indexOf(`--${name}`);
  const value = index === -1 ? undefined : process.argv[index + 1];
  if (!value) {
    console.error("Usage: pnpm check-route -- --from <station> --to <station> --date YYYY-MM-DD");
    process.exit(1);
  }
  return value;
}

async function main() {
  const query = { from: readArg("from"), to: readArg("to"), date: readArg("date") };
  const trains = parseRoute(await fetchRouteHtml(query));

  console.log(`Trains found: ${trains.length}`);
  for (const train of trains) {
    console.log(`\n${train.number}  ${train.routeTitle}  ${train.departure ?? "?"} → ${train.arrival ?? "?"}`);
    for (const seat of train.seats) {
      const price = seat.priceByn === null ? "" : `  ${seat.priceByn.toFixed(2)} BYN`;
      console.log(`  ${seat.seatType.padEnd(8)} ${String(seat.count).padStart(4)}  [${seat.rawName}]${price}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
