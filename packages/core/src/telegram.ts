import { Api } from "grammy";

// The bot is used for outgoing messages only: no polling and no webhook changes,
// because the same token serves a production webhook elsewhere.
let api: Api | undefined;

export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

export interface BroadcastResult {
  sent: number[];
  failed: { chatId: number; error: string }[];
}

export async function broadcast(chatIds: number[], text: string): Promise<BroadcastResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("Заполните TELEGRAM_BOT_TOKEN в .env");
  const bot = (api ??= new Api(token));

  const results = await Promise.allSettled(
    chatIds.map((chatId) => bot.sendMessage(chatId, text, { link_preview_options: { is_disabled: true } })),
  );

  const sent: number[] = [];
  const failed: BroadcastResult["failed"] = [];
  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      sent.push(chatIds[index]);
    } else {
      const error = result.reason instanceof Error ? result.reason.message : String(result.reason);
      failed.push({ chatId: chatIds[index], error });
    }
  });
  return { sent, failed };
}
