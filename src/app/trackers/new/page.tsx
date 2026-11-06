import { SEAT_LABELS, EVENT_LABELS, EVENT_KINDS } from "@/lib/domain";
import { env } from "@/lib/env";
import { formatPriceByn, tomorrowInMinsk } from "@/lib/format";
import { getRouteSearch } from "@/lib/trackers";
import type { TrainInfo } from "@/lib/rw/types";
import { AutoRefresh } from "../../auto-refresh";
import { createTrackersAction, searchRouteAction } from "../../actions";

export const dynamic = "force-dynamic";

interface SearchParams {
  from?: string;
  to?: string;
  date?: string;
  error?: string;
  search?: string;
}

const inputClass = "rounded border border-black/20 bg-transparent px-2 py-1.5 text-sm dark:border-white/20";

export default async function NewTrackerPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { from, to, date, error, search: searchId } = await searchParams;

  let trains: TrainInfo[] | null = null;
  let loadError: string | null = null;
  let isPending = false;
  let isWorkerOffline = false;

  if (searchId) {
    const searchRecord = await getRouteSearch(Number(searchId));
    if (searchRecord) {
      if (searchRecord.status === "pending") {
        isPending = true;
        const ageMs = new Date().getTime() - searchRecord.createdAt.getTime();
        if (ageMs > 30_000) isWorkerOffline = true;
      } else if (searchRecord.status === "done") {
        trains = searchRecord.result as unknown as TrainInfo[];
      } else if (searchRecord.status === "error") {
        loadError = searchRecord.error ?? "Неизвестная ошибка";
      }
    }
  }

  const fromVal = from ?? "";
  const toVal = to ?? "";
  const dateVal = date ?? "";

  const trainsPayload = trains?.map(({ number, routeTitle, departure, arrival }) => ({
    number,
    routeTitle,
    departure,
    arrival,
  }));

  return (
    <div className="space-y-8">
      {isPending && !isWorkerOffline && <AutoRefresh intervalMs={2000} />}

      <section className="space-y-3">
        <h1 className="text-xl font-semibold">Новый трекер</h1>
        <form action={searchRouteAction} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
          <label className="flex flex-col gap-1 text-sm">
            Откуда
            <input name="from" defaultValue={fromVal} required placeholder="Минск" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Куда
            <input name="to" defaultValue={toVal} required placeholder="Гродно" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Дата
            <input name="date" type="date" defaultValue={dateVal || tomorrowInMinsk()} required className={inputClass} />
          </label>
          <button type="submit" className="rounded bg-foreground px-4 py-1.5 text-sm text-background">
            Найти поезда
          </button>
        </form>
        <p className="text-xs opacity-60">
          Названия станций как на pass.rw.by, например «Минск-Пассажирский» или «Минск».
        </p>
      </section>

      {error === "none" ? (
        <p className="text-sm text-red-600">Отметьте хотя бы один поезд и тип мест.</p>
      ) : null}
      {isPending && !isWorkerOffline ? (
        <p className="text-sm opacity-70">Ищем поезда…</p>
      ) : null}
      {isWorkerOffline ? (
        <p className="text-sm text-amber-600">
          Воркер не запущен: запустите <code className="font-mono">pnpm worker</code> на любом устройстве.
        </p>
      ) : null}
      {loadError ? <p className="text-sm text-red-600">Не удалось загрузить расписание: {loadError}</p> : null}
      {trains?.length === 0 ? <p className="text-sm opacity-80">На эту дату поездов не найдено.</p> : null}

      {trains && trains.length > 0 ? (
        <form action={createTrackersAction} className="space-y-6">
          <input type="hidden" name="from" value={trains[0] ? fromVal : ""} />
          <input type="hidden" name="to" value={toVal} />
          <input type="hidden" name="date" value={dateVal} />
          <input type="hidden" name="trains" value={JSON.stringify(trainsPayload)} />

          <section className="space-y-4">
            <h2 className="font-medium">Поезда и типы мест</h2>
            {trains.map((train) => (
              <fieldset key={train.number} className="rounded border border-black/10 p-4 dark:border-white/10">
                <legend className="px-1 text-sm font-medium">
                  {train.number} · {train.routeTitle}
                  {train.departure && train.arrival ? ` · ${train.departure} → ${train.arrival}` : ""}
                </legend>
                {!train.sellingAllowed ? <p className="mb-2 text-xs opacity-70">Продажа сейчас недоступна</p> : null}
                {train.seats.length === 0 ? (
                  <p className="mb-2 text-xs opacity-70">В выдаче нет категорий мест</p>
                ) : null}
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="seats" value={`${train.number}|any`} />
                    <span>{SEAT_LABELS.any}: появление любых билетов</span>
                  </label>
                  {train.seats.map((seat) => (
                    <label key={seat.seatType} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="seats" value={`${train.number}|${seat.seatType}`} />
                      <span>
                        {SEAT_LABELS[seat.seatType]}: {seat.count} мест
                        {seat.priceByn !== null ? ` · ${formatPriceByn(seat.priceByn)}` : ""}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              Порог: уведомлять, если мест не меньше
              <input name="minSeats" type="number" min={1} defaultValue={1} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Интервал проверки, сек (минимум 60)
              <input
                name="intervalSec"
                type="number"
                min={60}
                defaultValue={env.DEFAULT_INTERVAL_SEC}
                className={inputClass}
              />
            </label>
            <fieldset className="flex flex-col gap-1 text-sm sm:col-span-2">
              <legend className="mb-1">О каких изменениях уведомлять</legend>
              {EVENT_KINDS.map((kind) => (
                <label key={kind} className="flex items-center gap-2">
                  <input type="checkbox" name="notifyOn" value={kind} defaultChecked />
                  {EVENT_LABELS[kind]}
                </label>
              ))}
            </fieldset>
          </section>

          <button type="submit" className="rounded bg-foreground px-4 py-2 text-sm text-background">
            Создать трекеры
          </button>
        </form>
      ) : null}
    </div>
  );
}
