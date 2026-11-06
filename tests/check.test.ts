import { type PGlite } from "@electric-sql/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrainInfo } from "../src/lib/rw/types";

const sendOwnerMessage = vi.fn<(text: string) => Promise<void>>();
vi.mock("../src/lib/notify/telegram", () => ({
  sendOwnerMessage: (text: string) => sendOwnerMessage(text),
  getOwnerChatId: () => 42,
}));

type Module = {
  checkTracker: typeof import("../src/worker/check").checkTracker;
  createTrackers: typeof import("../src/lib/trackers").createTrackers;
  getTracker: typeof import("../src/lib/trackers").getTracker;
  events: typeof import("../src/lib/db/schema").events;
  db: typeof import("../src/lib/db").db;
};
let mod: Module;
let trackerId: number;

const train = (platz: number, coupe = 0): TrainInfo => ({
  number: "679Ф",
  routeTitle: "Витебск — Гродно",
  departure: "06:17",
  arrival: "11:46",
  sellingAllowed: true,
  seats: [
    { seatType: "platz", rawName: "Плацкартный", count: platz, priceByn: 21.73 },
    { seatType: "coupe", rawName: "Купейный", count: coupe, priceByn: 30.16 },
  ],
});

const at = (minute: number) => new Date(Date.UTC(2026, 10, 6, 10, minute));

async function run(trains: TrainInfo[], minute: number) {
  const tracker = await mod.getTracker(trackerId);
  if (!tracker) throw new Error("tracker not found");
  await mod.checkTracker(tracker, trains, at(minute));
  return mod.getTracker(trackerId);
}

const eventRows = async () => {
  const rows = await mod.db.select().from(mod.events);
  return rows.map((row) => ({ kind: row.kind, seatType: row.seatType, curr: row.curr }));
};

beforeAll(async () => {
  process.env.DATABASE_URL = "pglite:memory";
  mod = {
    checkTracker: (await import("../src/worker/check")).checkTracker,
    createTrackers: (await import("../src/lib/trackers")).createTrackers,
    getTracker: (await import("../src/lib/trackers")).getTracker,
    events: (await import("../src/lib/db/schema")).events,
    db: (await import("../src/lib/db")).db,
  };
  // Apply migrations to in-memory pglite
  await migrate(mod.db as Parameters<typeof migrate>[0], {
    migrationsFolder: path.resolve(process.cwd(), "drizzle"),
  });
});

beforeEach(async () => {
  sendOwnerMessage.mockReset();
  sendOwnerMessage.mockResolvedValue(undefined);
  await (mod.db.$client as PGlite).exec("DELETE FROM rw.events; DELETE FROM rw.seat_state; DELETE FROM rw.trackers;");
  const [created] = await mod.createTrackers([
    {
      fromName: "Минск",
      toName: "Гродно",
      date: "2026-11-20",
      trainNumber: "679Ф",
      trainTitle: "Витебск — Гродно",
      departure: "06:17",
      arrival: "11:46",
      seatTypes: ["platz", "coupe"],
      minSeats: 1,
      notifyOn: ["appeared", "increased", "decreased", "soldOut"],
      intervalSec: 120,
    },
  ]);
  trackerId = created.id;
});

afterAll(async () => {
  await (mod?.db.$client as PGlite)?.close();
});

describe("checkTracker", () => {
  it("records a baseline on the first check without notifying", async () => {
    await run([train(0, 3)], 0);
    expect(sendOwnerMessage).not.toHaveBeenCalled();
    expect(await eventRows()).toEqual([]);
    expect((await mod.getTracker(trackerId))!.lastSuccessAt).not.toBeNull();
  });

  it("notifies once when seats appear, and not again on the same state", async () => {
    await run([train(0, 3)], 0);
    await run([train(4, 3)], 2);
    expect(sendOwnerMessage).toHaveBeenCalledTimes(1);
    expect(sendOwnerMessage.mock.calls[0][0]).toContain("🟢 Плацкартный: 0 → 4");
    expect(await eventRows()).toEqual([{ kind: "appeared", seatType: "platz", curr: 4 }]);

    await run([train(4, 3)], 4);
    expect(sendOwnerMessage).toHaveBeenCalledTimes(1);
  });

  it("confirms a sold-out reading on the second consecutive check only", async () => {
    await run([train(4, 3)], 0);
    await run([train(0, 3)], 2);
    expect(sendOwnerMessage).not.toHaveBeenCalled();

    await run([train(0, 3)], 4);
    expect(sendOwnerMessage).toHaveBeenCalledTimes(1);
    expect(sendOwnerMessage.mock.calls[0][0]).toContain("🔴 Плацкартный: 4 → 0");
  });

  it("keeps undelivered events and retries them on the next check", async () => {
    await run([train(0, 3)], 0);
    sendOwnerMessage.mockRejectedValueOnce(new Error("network down"));
    await expect(run([train(5, 3)], 2)).rejects.toThrow("network down");

    const allEvents = await mod.db.select().from(mod.events);
    const unsent = allEvents.filter((row) => row.notifiedAt === null);
    expect(unsent).toHaveLength(1);

    await run([train(5, 3)], 4);
    expect(sendOwnerMessage).toHaveBeenCalledTimes(2);
    const afterRetry = await mod.db.select().from(mod.events);
    expect(afterRetry.every((row) => row.notifiedAt !== null)).toBe(true);
  });

  it("does not treat a missing train as sold out", async () => {
    await run([train(4, 3)], 0);
    const tracker = await mod.getTracker(trackerId);
    if (!tracker) throw new Error("tracker not found");
    await mod.checkTracker(tracker, [], at(2));
    expect(sendOwnerMessage).not.toHaveBeenCalled();
    expect((await mod.getTracker(trackerId))!.lastError).toContain("не найден");
  });
});
