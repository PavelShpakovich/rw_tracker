import { Api } from "grammy";
import { env, requireTelegramEnv } from "../env";

// The bot is used for outgoing messages only: no polling and no webhook changes,
// because the same token serves a production webhook elsewhere.
let api: Api | undefined;

function telegramApi(token: string): Api {
  api ??= new Api(token);
  return api;
}

/** In a private chat the chat id equals the user id, so no /start handshake is needed. */
export function getOwnerChatId(): number | null {
  return env.TELEGRAM_ALLOWED_USER_ID ?? null;
}

export async function sendOwnerMessage(text: string): Promise<void> {
  const { token, chatId } = requireTelegramEnv();
  await telegramApi(token).sendMessage(chatId, text, { link_preview_options: { is_disabled: true } });
}
