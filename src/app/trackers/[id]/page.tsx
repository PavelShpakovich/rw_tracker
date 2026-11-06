import Link from "next/link";
import { notFound } from "next/navigation";
import { EVENT_LABELS, SEAT_LABELS } from "@/lib/domain";
import { formatDateTime, formatIsoDate, formatPriceByn } from "@/lib/format";
import { getTracker, listEvents, listSeatStates } from "@/lib/trackers";
import { AutoRefresh } from "../../auto-refresh";
import { deleteTrackerAction, requestCheckAction, setActiveAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function TrackerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  const tracker = Number.isInteger(id) ? await getTracker(id) : null;
  if (!tracker) notFound();

  const seats = await listSeatStates([tracker.id]);
  const history = await listEvents(tracker.id);
  const hasPending = tracker.forceCheckAt !== null;

  return (
    <>
      <AutoRefresh intervalMs={hasPending ? 2000 : 15000} />
      <div className="space-y-8">
        <section className="space-y-2">
          <Link href="/" className="text-sm opacity-70 hover:underline">← Все трекеры</Link>
          <h1 className="text-xl font-semibold">
            {tracker.trainNumber} · {tracker.trainTitle}
          </h1>
          <p className="text-sm opacity-80">
            {tracker.fromName} → {tracker.toName} · {formatIsoDate(tracker.date)}
            {tracker.departure && tracker.arrival ? ` · ${tracker.departure} → ${tracker.arrival}` : ""}
          </p>
          <p className="text-sm opacity-80">
            Порог: от {tracker.minSeats} мест · интервал {tracker.intervalSec} сек ·{" "}
            {tracker.active ? "активен" : "на паузе"}
          </p>
          <div className="flex gap-2 pt-2">
            <form action={setActiveAction}>
              <input type="hidden" name="id" value={tracker.id} />
              <input type="hidden" name="active" value={String(!tracker.active)} />
              <button type="submit" className="rounded border px-3 py-1.5 text-sm">
                {tracker.active ? "Пауза" : "Продолжить"}
              </button>
            </form>
            <form action={requestCheckAction}>
              <input type="hidden" name="id" value={tracker.id} />
              <button type="submit" className="rounded border px-3 py-1.5 text-sm">Проверить сейчас</button>
            </form>
            <form action={deleteTrackerAction}>
              <input type="hidden" name="id" value={tracker.id} />
              <button type="submit" className="rounded border border-red-500/50 px-3 py-1.5 text-sm text-red-600">
                Удалить
              </button>
            </form>
          </div>
          {tracker.lastError ? <p className="text-sm text-red-600">Последняя ошибка: {tracker.lastError}</p> : null}
          <p className="text-xs opacity-70">
            Последняя успешная проверка:{" "}
            {tracker.lastSuccessAt ? formatDateTime(tracker.lastSuccessAt) : "ещё не было"}
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-medium">Сейчас</h2>
          <table className="w-full text-sm">
            <thead className="text-left opacity-70">
              <tr>
                <th className="py-1">Тип мест</th>
                <th>Мест</th>
                <th>Цена</th>
              </tr>
            </thead>
            <tbody>
              {seats.map((seat) => (
                <tr key={seat.seatType} className="border-t border-black/10 dark:border-white/10">
                  <td className="py-1.5">{SEAT_LABELS[seat.seatType]}</td>
                  <td className="font-semibold">{seat.count}</td>
                  <td>{seat.priceByn !== null ? formatPriceByn(seat.priceByn) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="space-y-2">
          <h2 className="font-medium">История изменений</h2>
          {history.length === 0 ? (
            <p className="text-sm opacity-70">Изменений пока не было.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {history.map((event) => (
                <li key={event.id} className="flex flex-wrap gap-x-3">
                  <span className="opacity-70">{formatDateTime(event.at)}</span>
                  <span>
                    {EVENT_LABELS[event.kind]}: {SEAT_LABELS[event.seatType]} {event.prev ?? 0} → {event.curr}
                  </span>
                  {event.notifiedAt === null ? <span className="text-xs text-amber-600">не отправлено</span> : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
