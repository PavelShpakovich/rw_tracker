import { eq } from "drizzle-orm";
import { db } from "./db";
import { settings } from "./db/schema";

export const SETTING = {
  lastParseAlertAt: "last_parse_alert_at",
} as const;

export function getSetting(key: string): string | null {
  const row = db.select().from(settings).where(eq(settings.key, key)).get();
  return row?.value ?? null;
}

export function setSetting(key: string, value: string) {
  db.insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } })
    .run();
}
