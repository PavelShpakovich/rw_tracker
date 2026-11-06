import Link from "next/link";
import type { seatState, trackers } from "@rw/db/schema";
import { SEAT_LABELS, type SeatType } from "@rw/core/domain";
import {
  formatDuration,
  formatIsoDate,
  formatPriceByn,
  formatRelative,
  formatStation,
} from "@rw/core/format";
import { requestCheckAction, setActiveAction } from "@/app/actions";
import { SubmitButton } from "./form-controls";
import { Figure, Plate, Status, type FigureTone } from "./ui";

export type TrackerRow = typeof trackers.$inferSelect;
export type SeatStateRow = typeof seatState.$inferSelect;

function seatTone(count: number | undefined, minSeats: number): FigureTone {
  if (count === undefined) return "unknown";
  if (count >= minSeats) return "hit";
  return count > 0 ? "low" : "none";
}

export function trackerHasSeats(tracker: TrackerRow, seats: SeatStateRow[]) {
  return seats.some(
    (seat) =>
      tracker.seatTypes.includes(seat.seatType) &&
      seat.count >= tracker.minSeats,
  );
}

export function TrackerStatus({ tracker }: { tracker: TrackerRow }) {
  if (tracker.active && tracker.lastError) {
    return <Status tone="danger">ошибка проверки</Status>;
  }
  return tracker.active ? (
    <Status tone="ok">активен</Status>
  ) : (
    <Status tone="idle">на паузе</Status>
  );
}

export function TicketRoute({ tracker }: { tracker: TrackerRow }) {
  const duration =
    tracker.departure && tracker.arrival
      ? formatDuration(tracker.departure, tracker.arrival)
      : null;

  return (
    <div className="grid grid-cols-[auto_minmax(2rem,1fr)_auto] gap-x-3 sm:gap-x-6">
      <div>
        <p className="font-mono text-3xl leading-none sm:text-4xl">
          {tracker.departure ?? "—"}
        </p>
        <p className="mt-2 text-sm">{formatStation(tracker.fromName)}</p>
      </div>
      <div className="flex min-w-0 flex-col items-center pt-3.5 sm:pt-4">
        <div className="flex w-full items-center">
          <span className="size-1.5 shrink-0 bg-foreground" />
          <span className="h-px flex-1 bg-rule-strong" />
          <span className="size-1.5 shrink-0 bg-foreground" />
        </div>
        <span className="mt-2 whitespace-nowrap font-mono text-[11px] text-muted">
          {duration ?? ""}
        </span>
      </div>
      <div className="text-right">
        <p className="font-mono text-3xl leading-none sm:text-4xl">
          {tracker.arrival ?? "—"}
        </p>
        <p className="mt-2 text-sm">{formatStation(tracker.toName)}</p>
      </div>
    </div>
  );
}

export function SeatFigures({
  tracker,
  seats,
  size = "md",
}: {
  tracker: TrackerRow;
  seats: SeatStateRow[];
  size?: "md" | "lg";
}) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-x-6 gap-y-6">
      {tracker.seatTypes.map((seatType: SeatType) => {
        const state = seats.find((item) => item.seatType === seatType);
        return (
          <Figure
            key={seatType}
            size={size}
            label={SEAT_LABELS[seatType]}
            value={state ? state.count : "—"}
            tone={seatTone(state?.count, tracker.minSeats)}
            detail={
              state
                ? state.priceByn !== null
                  ? formatPriceByn(state.priceByn)
                  : ""
                : "нет данных"
            }
          />
        );
      })}
    </div>
  );
}

export function TrackerCard({
  tracker,
  seats,
}: {
  tracker: TrackerRow;
  seats: SeatStateRow[];
}) {
  const isChecking = tracker.forceCheckAt !== null;

  return (
    <article className="group relative">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Plate>{tracker.trainNumber}</Plate>
          <span className="truncate font-mono text-xs text-muted">
            {formatIsoDate(tracker.date)}
          </span>
        </div>
        <TrackerStatus tracker={tracker} />
      </div>

      <div className="mt-6">
        <TicketRoute tracker={tracker} />
      </div>

      <h2 className="mt-5 truncate text-sm text-muted">
        {/* Stretched link: the whole row opens the tracker, action buttons sit above it. */}
        <Link
          href={`/trackers/${tracker.id}`}
          className="underline-offset-4 after:absolute after:inset-0 group-hover:text-foreground group-hover:underline focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-foreground"
        >
          {tracker.trainTitle}
        </Link>
      </h2>

      <div className="mt-6">
        <SeatFigures tracker={tracker} seats={seats} />
      </div>

      <div className="relative z-10 mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-xs text-muted">
          {isChecking
            ? "проверка запрошена…"
            : tracker.lastSuccessAt
              ? `проверено ${formatRelative(tracker.lastSuccessAt)}`
              : "ждёт первой проверки"}
        </p>
        <div className="flex items-center gap-2">
          <form action={setActiveAction}>
            <input type="hidden" name="id" value={tracker.id} />
            <input
              type="hidden"
              name="active"
              value={String(!tracker.active)}
            />
            <SubmitButton variant="secondary" size="sm">
              {tracker.active ? "Пауза" : "Продолжить"}
            </SubmitButton>
          </form>
          <form action={requestCheckAction}>
            <input type="hidden" name="id" value={tracker.id} />
            <SubmitButton variant="ghost" size="sm" disabled={!tracker.active}>
              Проверить
            </SubmitButton>
          </form>
        </div>
      </div>
    </article>
  );
}
