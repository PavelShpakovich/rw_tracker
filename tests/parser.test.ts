import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BrokenPageError, classifySeat, parseRoute } from "../src/lib/rw/parser";

const fixture = (name: string) => readFileSync(path.join(__dirname, "fixtures", name), "utf8");

describe("parseRoute", () => {
  it("parses a real timetable page", () => {
    const trains = parseRoute(fixture("route-ok.html"));

    expect(trains).toHaveLength(6);

    const first = trains[0];
    expect(first.number).toBe("679Ф");
    expect(first.routeTitle).toBe("Витебск — Гродно");
    expect(first.departure).toBe("06:17");
    expect(first.arrival).toBe("11:46");
    expect(first.sellingAllowed).toBe(true);
  });

  it("sums sub-categories that inherit the previous seat name", () => {
    const first = parseRoute(fixture("route-ok.html"))[0];
    const bySeat = Object.fromEntries(first.seats.map((seat) => [seat.seatType, seat]));

    expect(bySeat.sitting).toMatchObject({ rawName: "Сидячий", count: 45, priceByn: 14.09 });
    // 43 + 153 from two "Плацкартный" blocks, the second one has an empty name in the markup
    expect(bySeat.platz).toMatchObject({ rawName: "Плацкартный", count: 196, priceByn: 21.73 });
    expect(bySeat.coupe).toMatchObject({ rawName: "Купейный", count: 42, priceByn: 30.16 });
  });

  it("returns an empty list for a valid page without trains", () => {
    expect(parseRoute(fixture("route-empty.html"))).toEqual([]);
  });

  it("throws on unrecognised markup instead of reporting zero seats", () => {
    expect(() => parseRoute(fixture("route-broken.html"))).toThrow(BrokenPageError);
  });
});

describe("classifySeat", () => {
  it.each([
    ["Сидячий", "sitting"],
    ["Плацкартный", "platz"],
    ["Купейный", "coupe"],
    ["СВ", "sv"],
    ["Мягкий", "soft"],
    ["Общий", "common"],
    ["Что-то новое", "other"],
  ])("maps %s to %s", (rawName, expected) => {
    expect(classifySeat(rawName)).toBe(expected);
  });
});
