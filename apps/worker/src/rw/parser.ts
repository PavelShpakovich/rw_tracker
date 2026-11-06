import * as cheerio from "cheerio";
import type { SeatType } from "@rw/core/domain";
import type { SeatCount, TrainInfo } from "@rw/core/rw-types";

export class BrokenPageError extends Error {
  constructor() {
    super("Route page has neither a timetable nor an empty-result marker: markup may have changed");
  }
}

// Order matters: the first matching pattern wins.
const SEAT_PATTERNS: Array<[RegExp, SeatType]> = [
  [/сидяч/i, "sitting"],
  [/плацкарт/i, "platz"],
  [/купе|купейн/i, "coupe"],
  [/^св$|спальн/i, "sv"],
  [/мягк/i, "soft"],
  [/общ/i, "common"],
];

export function classifySeat(rawName: string): SeatType {
  return SEAT_PATTERNS.find(([pattern]) => pattern.test(rawName))?.[1] ?? "other";
}

const clean = (text: string) => text.replace(/\s+/g, " ").trim();

/**
 * Parses the pass.rw.by route page. Returns [] for a valid "no trains" page
 * and throws BrokenPageError when the markup looks unrecognisable.
 */
export function parseRoute(html: string): TrainInfo[] {
  const $ = cheerio.load(html);
  const hasTimetable = $(".sch-table__body").length > 0;
  if (!hasTimetable && $(".sch-table__no-result").length === 0) {
    throw new BrokenPageError();
  }

  const trains: TrainInfo[] = [];

  $(".sch-table__row").each((_, element) => {
    const row = $(element);
    const number = row.attr("data-train-number")?.trim();
    if (!number) return;

    // A category without a name inherits the name of the previous item (e.g. a second "Плацкартный" block).
    let lastName = "";
    const seats = new Map<SeatType, SeatCount>();

    row.find(".sch-table__t-item").each((_, item) => {
      const sel = $(item);
      const name = clean(sel.children(".sch-table__t-name").text());
      if (name) lastName = name;

      const quantity = clean(sel.find(".sch-table__t-quant").text());
      const count = /^\d+$/.test(quantity) ? Number(quantity) : 0;

      const price = clean(sel.find(".ticket-cost").first().text()).replace(",", ".");
      const priceByn = price && !Number.isNaN(Number(price)) ? Number(price) : null;

      const seatType = classifySeat(lastName);
      const existing = seats.get(seatType);
      if (existing) {
        existing.count += count;
        existing.priceByn ??= priceByn;
      } else {
        seats.set(seatType, { seatType, rawName: lastName, count, priceByn });
      }
    });

    trains.push({
      number,
      routeTitle: clean(row.find(".train-route").text()),
      departure: clean(row.find(".train-from-time").first().text()) || null,
      arrival: clean(row.find(".train-to-time").first().text()) || null,
      sellingAllowed: row.attr("data-ticket_selling_allowed") === "true",
      seats: [...seats.values()],
    });
  });

  return trains;
}
