import type { SeatType } from "../domain";

export interface SeatCount {
  seatType: SeatType;
  rawName: string;
  count: number;
  priceByn: number | null;
}

export interface TrainInfo {
  number: string;
  routeTitle: string;
  departure: string | null;
  arrival: string | null;
  sellingAllowed: boolean;
  seats: SeatCount[];
}

export interface RouteQuery {
  from: string;
  to: string;
  date: string;
}
