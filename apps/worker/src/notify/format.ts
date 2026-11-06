import { SEAT_LABELS, type EventKind, type SeatType } from "@rw/core/domain";
import { formatIsoDate, formatPriceByn } from "@rw/core/format";
import { routePageUrl } from "../rw/client";

export interface NotificationEvent {
  kind: EventKind;
  seatType: SeatType;
  prev: number | null;
  curr: number;
  priceByn: number | null;
}

export interface NotificationTracker {
  trainNumber: string;
  trainTitle: string;
  fromName: string;
  toName: string;
  date: string;
  departure: string | null;
  arrival: string | null;
}

const EVENT_MARKS: Record<EventKind, string> = {
  appeared: "🟢",
  increased: "🔼",
  decreased: "🔽",
  soldOut: "🔴",
};

function formatEvent(event: NotificationEvent): string {
  const label = SEAT_LABELS[event.seatType];
  const change = `${event.prev ?? 0} → ${event.curr}`;
  const price = event.priceByn !== null && event.curr > 0 ? ` · ${formatPriceByn(event.priceByn)}` : "";
  return `${EVENT_MARKS[event.kind]} ${label}: ${change}${price}`;
}

export function formatTrackerMessage(tracker: NotificationTracker, events: NotificationEvent[]): string {
  const times = tracker.departure && tracker.arrival ? ` · ${tracker.departure} → ${tracker.arrival}` : "";
  const link = routePageUrl({ from: tracker.fromName, to: tracker.toName, date: tracker.date });

  const lines = [
    `🚆 ${tracker.trainNumber} · ${tracker.trainTitle}`,
    `${tracker.fromName} → ${tracker.toName} · ${formatIsoDate(tracker.date)}${times}`,
    "",
    ...events.map(formatEvent),
    "",
    `Купить: ${link}`,
  ];
  return lines.join("\n");
}

