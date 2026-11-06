import { env } from "@/lib/env";
import { formatDateTime } from "@rw/core/format";
import { isTelegramConfigured } from "@rw/core/telegram";
import { listRecipients } from "@rw/db/recipients";
import { listRecentCheckRuns } from "@rw/db/trackers";
import { addRecipientAction, removeRecipientAction, sendTestAction } from "../actions";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  ok: "ок",
  parse_error: "вёрстка не распознана",
  fetch_error: "сетевая ошибка",
  rate_limited: "сайт ограничил запросы",
};

const inputClass = "rounded border border-black/20 bg-transparent px-2 py-1.5 text-sm dark:border-white/20";

interface SearchParams {
  test?: string;
  sent?: string;
  failed?: string;
}

function testMessage({ test, sent, failed }: SearchParams) {
  switch (test) {
    case "ok":
      return { className: "text-green-600", text: `Тестовое сообщение отправлено: ${sent}.` };
    case "partial":
      return {
        className: "text-amber-600",
        text: `Отправлено: ${sent}, не доставлено: ${failed}. Получатели, которым не дошло, должны нажать Start в чате с ботом.`,
      };
    case "error":
      return { className: "text-red-600", text: "Не удалось отправить. Проверьте TELEGRAM_BOT_TOKEN в .env." };
    case "none":
      return { className: "text-red-600", text: "Добавьте хотя бы одного получателя." };
    default:
      return null;
  }
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const runs = await listRecentCheckRuns();
  const recipients = await listRecipients();
  const message = testMessage(params);

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-xl font-semibold">Настройки</h1>
        <ul className="space-y-1 text-sm">
          <li>Токен бота (TELEGRAM_BOT_TOKEN в .env): {isTelegramConfigured() ? "заполнен" : "не заполнен"}</li>
          <li>Интервал по умолчанию для новых трекеров: {env.DEFAULT_INTERVAL_SEC} сек</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Получатели уведомлений</h2>
        {recipients.length === 0 ? (
          <p className="text-sm opacity-70">Получателей пока нет. Уведомления никуда не отправляются.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {recipients.map((recipient) => (
              <li key={recipient.chatId} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-mono">{recipient.chatId}</span>
                {recipient.label ? <span className="opacity-70">{recipient.label}</span> : null}
                <form action={removeRecipientAction}>
                  <input type="hidden" name="chatId" value={recipient.chatId} />
                  <button type="submit" className="text-xs text-red-600 underline">
                    Удалить
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form action={addRecipientAction} className="grid gap-2 sm:grid-cols-[auto_1fr_auto] sm:items-end">
          <label className="flex flex-col gap-1 text-sm">
            Telegram ID
            <input name="chatId" type="number" min={1} required placeholder="454737360" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Имя (необязательно)
            <input name="label" maxLength={64} className={inputClass} />
          </label>
          <button type="submit" className="rounded bg-foreground px-4 py-1.5 text-sm text-background">
            Добавить
          </button>
        </form>
        <p className="text-xs opacity-60">
          ID можно узнать у @userinfobot. Каждый получатель должен один раз открыть бота и нажать Start.
        </p>

        <form action={sendTestAction} className="pt-1">
          <button type="submit" className="rounded border px-3 py-1.5 text-sm">
            Отправить тестовое сообщение всем
          </button>
        </form>
        {message ? <p className={`text-sm ${message.className}`}>{message.text}</p> : null}
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Последние проверки</h2>
        {runs.length === 0 ? (
          <p className="text-sm opacity-70">Проверок ещё не было. Они запускаются воркером (pnpm worker).</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {runs.map((run) => (
              <li key={run.id} className="flex flex-wrap gap-x-3">
                <span className="opacity-70">{formatDateTime(run.startedAt)}</span>
                <span className="font-mono text-xs opacity-70">{run.routeKey}</span>
                <span className={run.status === "ok" ? "" : "text-red-600"}>
                  {STATUS_LABELS[run.status] ?? run.status}
                  {run.status === "ok" && run.trainsFound !== null ? `, поездов: ${run.trainsFound}` : ""}
                </span>
                {run.error ? <span className="text-xs text-red-600">{run.error}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
