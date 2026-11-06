import { describe, expect, it } from "vitest";
import { observeTracker, type Tracker } from "../src/check";
import type { TrainInfo } from "@rw/core/rw-types";

const tracker = (seatTypes: Tracker["seatTypes"]) =>
  ({ trainNumber: "731Б", seatTypes }) as Tracker;

const train = (seats: TrainInfo["seats"]): TrainInfo => ({
  number: "731Б",
  routeTitle: "Минск-Пассажирский — Гродно",
  departure: "15:18",
  arrival: "19:10",
  sellingAllowed: false,
  seats,
});

describe("observeTracker", () => {
  it("counts a train with no seat categories as zero for 'any' instead of skipping it", () => {
    const observed = observeTracker(tracker(["any"]), [train([])]);
    expect(observed?.get("any")).toEqual({ count: 0, priceByn: null });
  });

  it("sums every category into 'any' and keeps the category counts separate", () => {
    const observed = observeTracker(tracker(["any", "platz"]), [
      train([
        { seatType: "platz", rawName: "Плацкартный", count: 10, priceByn: 21.73 },
        { seatType: "coupe", rawName: "Купейный", count: 4, priceByn: 30.16 },
      ]),
    ]);
    expect(observed?.get("any")).toEqual({ count: 14, priceByn: 21.73 });
    expect(observed?.get("platz")).toEqual({ count: 10, priceByn: 21.73 });
  });

  it("returns null when the train is not listed at all", () => {
    expect(observeTracker(tracker(["any"]), [])).toBeNull();
  });
});
