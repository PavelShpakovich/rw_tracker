import { z } from "zod";

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_ALLOWED_USER_ID: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.coerce.number().int().optional(),
  ),
  APP_PASSWORD: z.string().optional(),
  DEFAULT_INTERVAL_SEC: z.coerce.number().int().min(60).default(120),
  DATABASE_URL: z.string().default("pglite:./data/pg"),
});

export const env = envSchema.parse(process.env);

export function requireTelegramEnv() {
  if (!env.TELEGRAM_BOT_TOKEN || env.TELEGRAM_ALLOWED_USER_ID === undefined) {
    throw new Error("Заполните TELEGRAM_BOT_TOKEN и TELEGRAM_ALLOWED_USER_ID в .env");
  }
  return { token: env.TELEGRAM_BOT_TOKEN, chatId: env.TELEGRAM_ALLOWED_USER_ID };
}
