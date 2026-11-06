import { z } from "zod";

const envSchema = z.object({
  APP_PASSWORD: z.string().optional(),
  DEFAULT_INTERVAL_SEC: z.coerce.number().int().min(60).default(120),
});

export const env = envSchema.parse(process.env);
