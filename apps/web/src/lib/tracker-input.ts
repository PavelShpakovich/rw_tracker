import { z } from "zod";
import { EVENT_KINDS, SEAT_TYPES } from "@rw/core/domain";
import { env } from "./env";

export const trackerInputSchema = z.object({
  fromName: z.string().trim().min(1),
  toName: z.string().trim().min(1),
  date: z.iso.date(),
  trainNumber: z.string().trim().min(1),
  trainTitle: z.string().trim().min(1),
  departure: z.string().nullable(),
  arrival: z.string().nullable(),
  seatTypes: z.array(z.enum(SEAT_TYPES)).min(1),
  minSeats: z.number().int().min(1).default(1),
  notifyOn: z.array(z.enum(EVENT_KINDS)).min(1),
  intervalSec: z.number().int().min(60).default(env.DEFAULT_INTERVAL_SEC),
});

export type NewTracker = z.output<typeof trackerInputSchema>;
