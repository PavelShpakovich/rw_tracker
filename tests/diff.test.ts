import { describe, expect, it } from "vitest";
import { classifyChange, confirmSoldOut, diffSeats } from "../src/lib/diff";
import type { EventKind, SeatType } from "../src/lib/domain";

const ALL: EventKind[] = ["appeared", "increased", "decreased", "soldOut"];

describe("classifyChange (threshold = 2)", () => {
  it.each([
    [0, 3, "appeared"],
    [1, 2, "appeared"],
    [5, 1, "soldOut"],
    [2, 0, "soldOut"],
    [3, 7, "increased"],
    [7, 3, "decreased"],
    [0, 1, null], // below threshold both times
    [1, 0, null],
    [4, 4, null],
  ])("%i -> %i gives %s", (prev, curr, expected) => {
    expect(classifyChange(prev, curr, 2)).toBe(expected);
  });
});

describe("diffSeats", () => {
  it("reports only tracked seat types and only enabled kinds", () => {
    const events = diffSeats({
      previous: new Map<SeatType, number>([
        ["platz", 0],
        ["coupe", 5],
        ["sitting", 0],
      ]),
      current: new Map<SeatType, number>([
        ["platz", 4],
        ["coupe", 0],
        ["sitting", 9],
        ["soft", 1],
      ]),
      seatTypes: ["platz", "coupe"],
      minSeats: 1,
      notifyOn: ["appeared", "soldOut"],
    });

    expect(events).toEqual([
      { kind: "appeared", seatType: "platz", prev: 0, curr: 4 },
      { kind: "soldOut", seatType: "coupe", prev: 5, curr: 0 },
    ]);
  });

  it("treats a seat type missing from the previous state as zero", () => {
    const events = diffSeats({
      previous: new Map(),
      current: new Map<SeatType, number>([["platz", 3]]),
      seatTypes: ["platz"],
      minSeats: 1,
      notifyOn: ALL,
    });
    expect(events).toEqual([{ kind: "appeared", seatType: "platz", prev: null, curr: 3 }]);
  });
});

describe("confirmSoldOut", () => {
  const soldOut = { kind: "soldOut" as const, seatType: "platz" as const, prev: 4, curr: 0 };
  const appeared = { kind: "appeared" as const, seatType: "coupe" as const, prev: 0, curr: 2 };

  it("defers the first sold-out reading and keeps other events", () => {
    const { emit, deferred } = confirmSoldOut([soldOut, appeared], new Set());
    expect(emit).toEqual([appeared]);
    expect(deferred).toEqual(new Set(["platz"]));
  });

  it("emits sold-out when it is seen again on the next check", () => {
    const { emit, deferred } = confirmSoldOut([soldOut], new Set<SeatType>(["platz"]));
    expect(emit).toEqual([soldOut]);
    expect(deferred.size).toBe(0);
  });
});
