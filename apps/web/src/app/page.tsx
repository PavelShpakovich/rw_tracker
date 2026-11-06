import Link from "next/link";
import { SEAT_LABELS, type SeatType } from "@rw/core/domain";
import { formatDateTime, formatIsoDate, formatPriceByn } from "@rw/core/format";
import { listSeatStates, listTrackers } from "@rw/db/trackers";
import { requestCheckAction, setActiveAction } from "./actions";
import { AutoRefresh } from "./auto-refresh";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const trackers = await listTrackers();
  const states = await listSeatStates();
  const hasPending = trackers.some((t) => t.forceCheckAt !== null);

  if (trackers.length === 0) {
    return (
      <>
        <AutoRefresh intervalMs={15000} />
        <section className="space-y-3">
          <h1 className="text-xl font-semibold">Трекеров пока нет</h1>
          <p className="opacity-80">
            Создайте первый трекер: выберите маршрут и дату, затем отметьте поезда и типы мест.
          </p>
          <Link href="/trackers/new" className="inline-block rounded bg-foreground px-4 py-2 text-background">
            Новый трекер
          </Link>
        </section>
      </>
    );
  }

  return (
    <>
      <AutoRefresh intervalMs={hasPending ? 2000 : 15000} />
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Трекеры</h1>
          <form action={requestCheckAction}>
            <input type="hidden" name="id" value="all" />
            <button type="submit" className="rounded border px-3 py-1.5 text-sm">Проверить все</button>
          </form>
        </div>

        <ul className="space-y-4">
          {trackers.map((tracker) => {
            const seats = states.filter((state) => state.trackerId === tracker.id);
            return (
              <li key={tracker.id} className="rounded border border-black/10 p-4 dark:border-white/10">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Link href={`/trackers/${tracker.id}`} className="font-medium hover:underline">
                    {tracker.trainNumber} · {tracker.trainTitle}
                  </Link>
                  <span className="text-xs opacity-70">
                    {tracker.active ? "активен" : "на паузе"}
                  </span>
                </div>

                <p className="mt-1 text-sm opacity-80">
                  {tracker.fromName} → {tracker.toName} · {formatIsoDate(tracker.date)}
                  {tracker.departure && tracker.arrival ? ` · ${tracker.departure} → ${tracker.arrival}` : ""}
                </p>

                <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                  {tracker.seatTypes.map((seatType: SeatType) => {
                    const state = seats.find((item) => item.seatType === seatType);
                    return (
                      <li key={seatType}>
                        {SEAT_LABELS[seatType]}:{" "}
                        <span className="font-semibold">{state ? state.count : "—"}</span>
                        {state?.priceByn ? <span className="opacity-60"> · {formatPriceByn(state.priceByn)}</span> : null}
                      </li>
                    );
                  })}
                </ul>

                <p className="mt-3 text-xs opacity-70">
                  Последняя успешная проверка:{" "}
                  {tracker.lastSuccessAt ? formatDateTime(tracker.lastSuccessAt) : "ещё не было"}
                </p>
                {tracker.lastError ? <p className="mt-1 text-xs text-red-600">Ошибка: {tracker.lastError}</p> : null}

                <div className="mt-3 flex gap-2">
                  <form action={setActiveAction}>
                    <input type="hidden" name="id" value={tracker.id} />
                    <input type="hidden" name="active" value={String(!tracker.active)} />
                    <button type="submit" className="rounded border px-3 py-1 text-xs">
                      {tracker.active ? "Пауза" : "Продолжить"}
                    </button>
                  </form>
                  <form action={requestCheckAction}>
                    <input type="hidden" name="id" value={tracker.id} />
                    <button type="submit" className="rounded border px-3 py-1 text-xs">Проверить сейчас</button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
