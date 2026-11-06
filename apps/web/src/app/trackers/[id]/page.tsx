import Link from "next/link";
import { notFound } from "next/navigation";
import { EVENT_LABELS, SEAT_LABELS, type EventKind } from "@rw/core/domain";
import {
  formatDateTime,
  formatDayLabel,
  formatIsoDate,
  formatPriceByn,
  formatRelative,
  formatTime,
  plural,
} from "@rw/core/format";
import { getTracker, listEvents, listSeatStates } from "@rw/db/trackers";
import { AutoRefresh } from "../../auto-refresh";
import {
  deleteTrackerAction,
  requestCheckAction,
  setActiveAction,
} from "../../actions";
import { ConfirmSubmitButton, SubmitButton } from "@/components/form-controls";
import {
  SeatFigures,
  TicketRoute,
  TrackerStatus,
} from "@/components/tracker-card";
import { Notice, PageHeader, Plate, Section } from "@/components/ui";

export const dynamic = "force-dynamic";

const eventMark: Record<EventKind, string> = {
  appeared: "text-ok",
  increased: "text-ok",
  decreased: "text-warn",
  soldOut: "text-danger",
};

export default async function TrackerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  const tracker = Number.isInteger(id) ? await getTracker(id) : null;
  if (!tracker) notFound();

  const seats = await listSeatStates([tracker.id]);
  const history = await listEvents(tracker.id);
  const hasPending = tracker.forceCheckAt !== null;
  const now = new Date();

  const days: { label: string; events: typeof history }[] = [];
  for (const event of history) {
    const label = formatDayLabel(event.at, now);
    const last = days.at(-1);
    if (last?.label === label) last.events.push(event);
    else days.push({ label, events: [event] });
  }

  return (
    <div className="space-y-12">
      {hasPending ? <AutoRefresh intervalMs={2000} /> : null}

      <div className="space-y-8">
        <Link
          href="/"
          className="inline-block text-sm text-muted underline-offset-4 hover:text-foreground hover:underline"
        >
          ← Все трекеры
        </Link>
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Plate>{tracker.trainNumber}</Plate>
            <span className="font-mono text-xs text-muted">
              {formatIsoDate(tracker.date)}
            </span>
            <TrackerStatus tracker={tracker} />
          </div>
          <PageHeader title={tracker.trainTitle} />
        </div>
        <TicketRoute tracker={tracker} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-y border-foreground py-4">
        <p className="font-mono text-xs text-muted">
          от {tracker.minSeats}{" "}
          {plural(tracker.minSeats, "места", "мест", "мест")} · каждые{" "}
          {tracker.intervalSec} с
        </p>
        <div className="flex items-center gap-2">
          <form action={setActiveAction}>
            <input type="hidden" name="id" value={tracker.id} />
            <input type="hidden" name="active" value={String(!tracker.active)} />
            <SubmitButton variant="secondary" size="sm">
              {tracker.active ? "Пауза" : "Продолжить"}
            </SubmitButton>
          </form>
          <form action={requestCheckAction}>
            <input type="hidden" name="id" value={tracker.id} />
            <SubmitButton variant="primary" size="sm" disabled={!tracker.active}>
              Проверить сейчас
            </SubmitButton>
          </form>
        </div>
      </div>

      {tracker.lastError ? (
        <Notice tone="danger">
          Последняя проверка не удалась: {tracker.lastError}
        </Notice>
      ) : null}

      <Section
        title="Наличие мест"
        meta={
          tracker.lastSuccessAt
            ? `проверено ${formatRelative(tracker.lastSuccessAt, now)}`
            : "ждёт первой проверки"
        }
      >
        <SeatFigures tracker={tracker} seats={seats} size="lg" />
      </Section>

      <Section
        title="История изменений"
        meta={
          history.length > 0
            ? `${history.length} ${plural(history.length, "событие", "события", "событий")}`
            : undefined
        }
      >
        {history.length === 0 ? (
          <p className="text-sm text-muted">
            Изменений пока не было. Первая проверка задаёт начальное состояние.
          </p>
        ) : (
          <div className="space-y-8">
            {days.map((day) => (
              <div key={day.label}>
                <p className="mb-2 text-xs text-muted">{day.label}</p>
                <ul className="divide-y divide-rule border-y border-rule">
                  {day.events.map((event) => (
                    <li
                      key={event.id}
                      className="grid grid-cols-[3.25rem_1fr_auto] items-baseline gap-x-4 py-3"
                    >
                      <time
                        dateTime={event.at.toISOString()}
                        title={formatDateTime(event.at)}
                        className="font-mono text-xs text-muted"
                      >
                        {formatTime(event.at)}
                      </time>
                      <div className="min-w-0">
                        <p className="text-sm">
                          {EVENT_LABELS[event.kind]}
                          <span className="text-muted">
                            {" "}
                            · {SEAT_LABELS[event.seatType]}
                          </span>
                        </p>
                        {event.notifiedAt === null ? (
                          <p className="mt-0.5 text-xs text-warn">
                            уведомление не отправлено
                          </p>
                        ) : null}
                      </div>
                      <p className="whitespace-nowrap font-mono text-sm">
                        <span className="text-muted">{event.prev ?? 0}</span>
                        <span className="text-subtle"> → </span>
                        <span className={eventMark[event.kind]}>{event.curr}</span>
                        {event.priceByn !== null ? (
                          <span className="ml-3 hidden text-xs text-muted sm:inline">
                            {formatPriceByn(event.priceByn)}
                          </span>
                        ) : null}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Section>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-rule pt-6">
        <p className="max-w-md text-sm text-muted">
          Удаление стирает трекер вместе с историей изменений.
        </p>
        <form action={deleteTrackerAction}>
          <input type="hidden" name="id" value={tracker.id} />
          <ConfirmSubmitButton prompt={`Удалить трекер ${tracker.trainNumber}?`}>
            Удалить трекер
          </ConfirmSubmitButton>
        </form>
      </div>
    </div>
  );
}
