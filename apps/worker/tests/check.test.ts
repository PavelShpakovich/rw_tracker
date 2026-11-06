import { type PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrainInfo } from "@rw/core/rw-types";
import type { BroadcastResult } from "@rw/core/telegram";

const broadcast = vi.fn<(chatIds: number[], text: string) => Promise<BroadcastResult>>();
vi.mock("@rw/core/telegram", () => ({
  broadcast: (chatIds: number[], text: string) => broadcast(chatIds, text),
}));

type Module = {
  checkTracker: typeof import("../src/check").checkTracker;
  createTrackers: typeof import("@rw/db/trackers").createTrackers;
  getTracker: typeof import("@rw/db/trackers").getTracker;
  addRecipient: typeof import("@rw/db/recipients").addRecipient;
  removeRecipient: typeof import("@rw/db/recipients").removeRecipient;
  events: typeof import("@rw/db/schema").events;
  db: typeof import("@rw/db/client").db;
};
let mod: Module;
let trackerId: number;

const RECIPIENT = 42;

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

const delivered = (): BroadcastResult => ({ sent: [RECIPIENT], failed: [] });

beforeAll(async () => {
  process.env.DATABASE_URL = "pglite:memory";
  mod = {
    checkTracker: (await import("../src/check")).checkTracker,
    createTrackers: (await import("@rw/db/trackers")).createTrackers,
    getTracker: (await import("@rw/db/trackers")).getTracker,
    addRecipient: (await import("@rw/db/recipients")).addRecipient,
    removeRecipient: (await import("@rw/db/recipients")).removeRecipient,
    events: (await import("@rw/db/schema")).events,
    db: (await import("@rw/db/client")).db,
  };
  const { runMigrations } = await import("@rw/db/migrate");
  await runMigrations();
});

beforeEach(async () => {
  broadcast.mockReset();
  broadcast.mockImplementation(async () => delivered());
  await (mod.db.$client as PGlite).exec(
    "DELETE FROM rw.events; DELETE FROM rw.seat_state; DELETE FROM rw.trackers; DELETE FROM rw.telegram_recipients;",
  );
  await mod.addRecipient(RECIPIENT, null);
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
    expect(broadcast).not.toHaveBeenCalled();
    expect(await eventRows()).toEqual([]);
    expect((await mod.getTracker(trackerId))!.lastSuccessAt).not.toBeNull();
  });

  it("notifies once when seats appear, and not again on the same state", async () => {
    await run([train(0, 3)], 0);
    await run([train(4, 3)], 2);
    expect(broadcast).toHaveBeenCalledTimes(1);
    expect(broadcast.mock.calls[0][0]).toEqual([RECIPIENT]);
    expect(broadcast.mock.calls[0][1]).toContain("🟢 Плацкартный: 0 → 4");
    expect(await eventRows()).toEqual([{ kind: "appeared", seatType: "platz", curr: 4 }]);

    await run([train(4, 3)], 4);
    expect(broadcast).toHaveBeenCalledTimes(1);
  });

  it("confirms a sold-out reading on the second consecutive check only", async () => {
    await run([train(4, 3)], 0);
    await run([train(0, 3)], 2);
    expect(broadcast).not.toHaveBeenCalled();

    await run([train(0, 3)], 4);
    expect(broadcast).toHaveBeenCalledTimes(1);
    expect(broadcast.mock.calls[0][1]).toContain("🔴 Плацкартный: 4 → 0");
  });

  it("keeps undelivered events and retries them on the next check", async () => {
    await run([train(0, 3)], 0);
    broadcast.mockResolvedValueOnce({ sent: [], failed: [{ chatId: RECIPIENT, error: "network down" }] });
    await expect(run([train(5, 3)], 2)).rejects.toThrow("Не доставлено ни одному получателю");

    const allEvents = await mod.db.select().from(mod.events);
    const unsent = allEvents.filter((row) => row.notifiedAt === null);
    expect(unsent).toHaveLength(1);

    await run([train(5, 3)], 4);
    expect(broadcast).toHaveBeenCalledTimes(2);
    const afterRetry = await mod.db.select().from(mod.events);
    expect(afterRetry.every((row) => row.notifiedAt !== null)).toBe(true);
  });

  it("keeps events unsent while no recipients are configured", async () => {
    await run([train(0, 3)], 0);
    await mod.removeRecipient(RECIPIENT);
    await run([train(5, 3)], 2);
    expect(broadcast).not.toHaveBeenCalled();

    const allEvents = await mod.db.select().from(mod.events);
    expect(allEvents).toHaveLength(1);
    expect(allEvents[0].notifiedAt).toBeNull();
  });

  it("does not treat a missing train as sold out", async () => {
    await run([train(4, 3)], 0);
    const tracker = await mod.getTracker(trackerId);
    if (!tracker) throw new Error("tracker not found");
    await mod.checkTracker(tracker, [], at(2));
    expect(broadcast).not.toHaveBeenCalled();
    expect((await mod.getTracker(trackerId))!.lastError).toContain("не найден");
  });
});
