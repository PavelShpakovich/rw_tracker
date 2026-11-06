import type { EventKind, SeatType } from "@rw/core/domain";

export interface ChangeEvent {
  kind: EventKind;
  seatType: SeatType;
  prev: number | null;
  curr: number;
}

export function classifyChange(prev: number, curr: number, minSeats: number): EventKind | null {
  if (prev === curr) return null;
  if (prev < minSeats && curr >= minSeats) return "appeared";
  if (prev >= minSeats && curr < minSeats) return "soldOut";
  // Reaching this branch means both values are at or above the threshold.
  if (curr >= minSeats) return curr > prev ? "increased" : "decreased";
  return null;
}

export function diffSeats(params: {
  previous: Map<SeatType, number>;
  current: Map<SeatType, number>;
  seatTypes: SeatType[];
  minSeats: number;
  notifyOn: EventKind[];
}): ChangeEvent[] {
  const { previous, current, seatTypes, minSeats, notifyOn } = params;
  const events: ChangeEvent[] = [];

  for (const seatType of seatTypes) {
    const curr = current.get(seatType);
    if (curr === undefined) continue;

    const prevValue = previous.get(seatType);
    const kind = classifyChange(prevValue ?? 0, curr, minSeats);
    if (kind && notifyOn.includes(kind)) {
      events.push({ kind, seatType, prev: prevValue ?? null, curr });
    }
  }

  return events;
}

/**
 * A single "sold out" reading can be a glitch on the source site, so it is only
 * emitted when it is seen on two consecutive checks. Returns the events to emit
 * and the seat types whose state must stay unchanged until the next check.
 */
export function confirmSoldOut(
  events: ChangeEvent[],
  pending: Set<SeatType>,
): { emit: ChangeEvent[]; deferred: Set<SeatType> } {
  const deferred = new Set<SeatType>();
  const emit = events.filter((event) => {
    if (event.kind !== "soldOut" || pending.has(event.seatType)) return true;
    deferred.add(event.seatType);
    return false;
  });
  return { emit, deferred };
}
