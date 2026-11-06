export const SEAT_TYPES = ["sitting", "platz", "coupe", "sv", "soft", "common", "other", "any"] as const;
export type SeatType = (typeof SEAT_TYPES)[number];

export const SEAT_LABELS: Record<SeatType, string> = {
  sitting: "Сидячий",
  platz: "Плацкартный",
  coupe: "Купейный",
  sv: "СВ",
  soft: "Мягкий",
  common: "Общий",
  other: "Прочие",
  any: "Любые места",
};

export const EVENT_KINDS = ["appeared", "increased", "decreased", "soldOut"] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

export const EVENT_LABELS: Record<EventKind, string> = {
  appeared: "Появились места",
  increased: "Мест стало больше",
  decreased: "Мест стало меньше",
  soldOut: "Места закончились (ниже порога)",
};
