import { env } from "@/lib/env";
import { formatDateTime } from "@/lib/format";
import { getOwnerChatId } from "@/lib/notify/telegram";
import { listRecentCheckRuns } from "@/lib/trackers";
import { sendTestAction } from "../actions";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  ok: "ок",
  parse_error: "вёрстка не распознана",
  fetch_error: "сетевая ошибка",
  rate_limited: "сайт ограничил запросы",
};

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ test?: string }> }) {
  const { test } = await searchParams;
  const runs = await listRecentCheckRuns();
  const botConfigured = Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_ALLOWED_USER_ID !== undefined);
  const recipient = getOwnerChatId();

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h1 className="text-xl font-semibold">Настройки</h1>
        <ul className="space-y-1 text-sm">
          <li>Токен бота и ID получателя в .env: {botConfigured ? "заполнены" : "не заполнены"}</li>
          <li>Получатель уведомлений: {recipient !== null ? recipient : "не задан"}</li>
          <li>Интервал по умолчанию для новых трекеров: {env.DEFAULT_INTERVAL_SEC} сек</li>
        </ul>
        <form action={sendTestAction} className="pt-2">
          <button type="submit" className="rounded border px-3 py-1.5 text-sm">
            Отправить тестовое сообщение
          </button>
        </form>
        {test === "ok" ? <p className="text-sm text-green-600">Тестовое сообщение отправлено.</p> : null}
        {test === "error" ? (
          <p className="text-sm text-red-600">
            Не удалось отправить. Проверьте TELEGRAM_BOT_TOKEN и TELEGRAM_ALLOWED_USER_ID в .env, и нажмите Start в чате с ботом.
          </p>
        ) : null}
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
