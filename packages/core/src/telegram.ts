import { Api } from "grammy";

// The bot is used for outgoing messages only: no polling and no webhook changes,
// because the same token serves a production webhook elsewhere.
let api: Api | undefined;

/** In a private chat the chat id equals the user id, so no /start handshake is needed. */
export function getOwnerChatId(): number | null {
  const raw = process.env.TELEGRAM_ALLOWED_USER_ID;
  if (!raw) return null;
  const chatId = Number(raw);
  return Number.isInteger(chatId) ? chatId : null;
}

export function getTelegramConfig(): { token: string; chatId: number } | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = getOwnerChatId();
  return token && chatId !== null ? { token, chatId } : null;
}

export async function sendOwnerMessage(text: string): Promise<void> {
  const config = getTelegramConfig();
  if (!config) throw new Error("Заполните TELEGRAM_BOT_TOKEN и TELEGRAM_ALLOWED_USER_ID в .env");
  api ??= new Api(config.token);
  await api.sendMessage(config.chatId, text, { link_preview_options: { is_disabled: true } });
}
