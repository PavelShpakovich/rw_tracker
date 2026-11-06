import { eq } from "drizzle-orm";
import { db } from "./client";
import { settings } from "./schema";

export const SETTING = {
  lastParseAlertAt: "last_parse_alert_at",
} as const;

export async function getSetting(key: string): Promise<string | null> {
  const rows = await db.select().from(settings).where(eq(settings.key, key));
  return rows[0]?.value ?? null;
}

export async function setSetting(key: string, value: string) {
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } });
}
