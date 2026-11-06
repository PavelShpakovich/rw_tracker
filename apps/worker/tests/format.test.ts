import { describe, expect, it } from "vitest";
import { formatTrackerMessage } from "../src/notify/format";

describe("formatTrackerMessage", () => {
  it("renders train, route, events and a booking link", () => {
    const text = formatTrackerMessage(
      {
        trainNumber: "679Ф",
        trainTitle: "Витебск — Гродно",
        fromName: "Минск",
        toName: "Гродно",
        date: "2026-11-20",
        departure: "06:17",
        arrival: "11:46",
      },
      [
        { kind: "appeared", seatType: "platz", prev: 0, curr: 4, priceByn: 21.73 },
        { kind: "soldOut", seatType: "coupe", prev: 5, curr: 0, priceByn: null },
      ],
    );

    expect(text).toContain("🚆 679Ф · Витебск — Гродно");
    expect(text).toContain("Минск → Гродно · 20.11.2026 · 06:17 → 11:46");
    expect(text).toContain("🟢 Плацкартный: 0 → 4 · 21,73 BYN");
    expect(text).toContain("🔴 Купейный: 5 → 0");
    expect(text).toContain("https://pass.rw.by/ru/route/?from=");
  });
});
