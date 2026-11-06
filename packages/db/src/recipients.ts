import { asc, eq } from "drizzle-orm";
import { db } from "./client";
import { telegramRecipients } from "./schema";

export async function listRecipients() {
  return db.select().from(telegramRecipients).orderBy(asc(telegramRecipients.createdAt));
}

export async function listRecipientIds(): Promise<number[]> {
  const rows = await db.select({ chatId: telegramRecipients.chatId }).from(telegramRecipients);
  return rows.map((row) => row.chatId);
}

export async function addRecipient(chatId: number, label: string | null) {
  await db
    .insert(telegramRecipients)
    .values({ chatId, label, createdAt: new Date() })
    .onConflictDoUpdate({ target: telegramRecipients.chatId, set: { label } });
}

export async function removeRecipient(chatId: number) {
  await db.delete(telegramRecipients).where(eq(telegramRecipients.chatId, chatId));
}
