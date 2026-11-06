import { SEAT_LABELS, EVENT_LABELS, EVENT_KINDS } from "@/lib/domain";
import { env } from "@/lib/env";
import { formatPriceByn, tomorrowInMinsk } from "@/lib/format";
import { fetchRouteHtml } from "@/lib/rw/client";
import { parseRoute } from "@/lib/rw/parser";
import type { TrainInfo } from "@/lib/rw/types";
import { createTrackersAction } from "../../actions";

export const dynamic = "force-dynamic";

interface SearchParams {
  from?: string;
  to?: string;
  date?: string;
  error?: string;
}

const inputClass = "rounded border border-black/20 bg-transparent px-2 py-1.5 text-sm dark:border-white/20";

export default async function NewTrackerPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { from, to, date, error } = await searchParams;

  let trains: TrainInfo[] | null = null;
  let loadError: string | null = null;
  if (from && to && date) {
    try {
      trains = parseRoute(await fetchRouteHtml({ from, to, date }));
    } catch (cause) {
      loadError = cause instanceof Error ? cause.message : String(cause);
    }
  }

  const trainsPayload = trains?.map(({ number, routeTitle, departure, arrival }) => ({
    number,
    routeTitle,
    departure,
    arrival,
  }));

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-xl font-semibold">Новый трекер</h1>
        <form method="get" className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
          <label className="flex flex-col gap-1 text-sm">
            Откуда
            <input name="from" defaultValue={from} required placeholder="Минск" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Куда
            <input name="to" defaultValue={to} required placeholder="Гродно" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Дата
            <input name="date" type="date" defaultValue={date ?? tomorrowInMinsk()} required className={inputClass} />
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
      {loadError ? <p className="text-sm text-red-600">Не удалось загрузить расписание: {loadError}</p> : null}
      {trains?.length === 0 ? <p className="text-sm opacity-80">На эту дату поездов не найдено.</p> : null}

      {trains && trains.length > 0 && from && to && date ? (
        <form action={createTrackersAction} className="space-y-6">
          <input type="hidden" name="from" value={from} />
          <input type="hidden" name="to" value={to} />
          <input type="hidden" name="date" value={date} />
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
