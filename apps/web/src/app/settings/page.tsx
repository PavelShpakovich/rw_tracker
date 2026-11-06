import { env } from "@/lib/env";
import {
  formatDateTime,
  formatIsoDate,
  formatStation,
} from "@rw/core/format";
import { isTelegramConfigured } from "@rw/core/telegram";
import { listRecipients } from "@rw/db/recipients";
import { listRecentCheckRuns } from "@rw/db/trackers";
import {
  addRecipientAction,
  removeRecipientAction,
  sendTestAction,
} from "../actions";
import { ConfirmSubmitButton, SubmitButton } from "@/components/form-controls";
import { Field, Input, Notice, PageHeader, Section, Status } from "@/components/ui";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  ok: "успешно",
  parse_error: "изменилась вёрстка",
  fetch_error: "ошибка сети",
  rate_limited: "ограничение запросов",
};

const STATUS_TONES: Record<string, "ok" | "warn" | "danger"> = {
  ok: "ok",
  parse_error: "warn",
  fetch_error: "danger",
  rate_limited: "warn",
};

interface SearchParams {
  test?: string;
  sent?: string;
  failed?: string;
}

type CheckRun = Awaited<ReturnType<typeof listRecentCheckRuns>>[number];
type RunGroup = CheckRun & { repeats: number };
const VISIBLE_RUNS = 5;

// Consecutive identical results (same route, status and error) collapse into one row.
function groupRuns(runs: CheckRun[]): RunGroup[] {
  const groups: RunGroup[] = [];
  for (const run of runs) {
    const last = groups.at(-1);
    if (
      last &&
      last.routeKey === run.routeKey &&
      last.status === run.status &&
      last.error === run.error
    ) {
      last.repeats += 1;
    } else {
      groups.push({ ...run, repeats: 1 });
    }
  }
  return groups;
}

function formatRouteKey(routeKey: string) {
  const [from, to, date] = routeKey.split("|");
  if (!from || !to || !date) return routeKey;
  return `${formatStation(from)} → ${formatStation(to)} · ${formatIsoDate(date)}`;
}

function testMessage({ test, sent, failed }: SearchParams) {
  switch (test) {
    case "ok":
      return { tone: "ok" as const, text: `Тестовое сообщение отправлено: ${sent}.` };
    case "partial":
      return {
        tone: "warn" as const,
        text: `Отправлено: ${sent}, не доставлено: ${failed}. Проверьте, что получатели открыли чат с ботом и нажали Start.`,
      };
    case "error":
      return {
        tone: "danger" as const,
        text: "Не удалось отправить. Проверьте TELEGRAM_BOT_TOKEN.",
      };
    case "none":
      return { tone: "warn" as const, text: "Сначала добавьте получателя уведомлений." };
    default:
      return null;
  }
}

function RunRow({ run }: { run: RunGroup }) {
  return (
    <li className="grid gap-x-6 gap-y-1 py-3 sm:grid-cols-[1fr_auto] sm:items-baseline">
      <div className="min-w-0">
        <p className="truncate text-sm">{formatRouteKey(run.routeKey)}</p>
        <p className="mt-0.5 font-mono text-xs text-muted">
          {formatDateTime(run.startedAt)}
          {run.repeats > 1 ? ` · ×${run.repeats}` : ""}
          {run.status === "ok" && run.trainsFound !== null
            ? ` · поездов: ${run.trainsFound}`
            : ""}
        </p>
      </div>
      <Status tone={STATUS_TONES[run.status] ?? "warn"}>
        {STATUS_LABELS[run.status] ?? run.status}
      </Status>
      {run.error ? (
        <p className="break-words text-xs text-danger sm:col-span-2">{run.error}</p>
      ) : null}
    </li>
  );
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const runs = groupRuns(await listRecentCheckRuns());
  const recipients = await listRecipients();
  const message = testMessage(params);
  const telegramReady = isTelegramConfigured();

  return (
    <div className="space-y-14">
      <PageHeader
        title="Настройки"
        description="Кому слать уведомления и что происходит с проверками."
      />

      <Section title="Telegram">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5">
            <Status tone={telegramReady ? "ok" : "warn"}>
              {telegramReady ? "токен бота настроен" : "токен бота не задан"}
            </Status>
            <p className="font-mono text-xs text-muted">
              интервал по умолчанию: {env.DEFAULT_INTERVAL_SEC} с
            </p>
          </div>
          <form action={sendTestAction}>
            <SubmitButton variant="secondary" size="sm">
              Отправить тест
            </SubmitButton>
          </form>
        </div>
        {message ? (
          <div className="mt-5">
            <Notice tone={message.tone}>{message.text}</Notice>
          </div>
        ) : null}
      </Section>

      <Section title="Получатели" meta={recipients.length}>
        {recipients.length === 0 ? (
          <p className="text-sm text-muted">
            Получателей пока нет, уведомления никуда не уходят.
          </p>
        ) : (
          <ul className="divide-y divide-rule border-y border-rule">
            {recipients.map((recipient) => (
              <li
                key={recipient.chatId}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm">{recipient.label || "Без имени"}</p>
                  <p className="mt-0.5 font-mono text-xs text-muted">{recipient.chatId}</p>
                </div>
                <form action={removeRecipientAction}>
                  <input type="hidden" name="chatId" value={recipient.chatId} />
                  <ConfirmSubmitButton prompt="Удалить получателя?">
                    Удалить
                  </ConfirmSubmitButton>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form
          action={addRecipientAction}
          className="mt-8 grid gap-4 sm:grid-cols-[1fr_1.2fr_auto] sm:items-end"
        >
          <Field label="Telegram ID">
            <Input name="chatId" type="number" min={1} required placeholder="123456789" />
          </Field>
          <Field label="Имя">
            <Input name="label" maxLength={64} placeholder="Необязательно" />
          </Field>
          <SubmitButton variant="primary">Добавить</SubmitButton>
        </form>
        <p className="mt-3 text-xs text-muted">
          ID можно узнать у @userinfobot. Каждый получатель должен открыть чат с
          ботом и нажать Start.
        </p>
      </Section>

      <Section title="Последние проверки">
        {runs.length === 0 ? (
          <p className="text-sm text-muted">Проверок ещё не было. Они появятся после запуска воркера.</p>
        ) : (
          <>
            <ul className="divide-y divide-rule border-y border-rule">
              {runs.slice(0, VISIBLE_RUNS).map((run) => (
                <RunRow key={run.id} run={run} />
              ))}
            </ul>
            {runs.length > VISIBLE_RUNS ? (
              <details className="group mt-3">
                <summary className="cursor-pointer list-none text-xs text-muted underline-offset-4 hover:text-foreground hover:underline [&::-webkit-details-marker]:hidden">
                  <span className="group-open:hidden">Показать ещё {runs.length - VISIBLE_RUNS}</span>
                  <span className="hidden group-open:inline">Свернуть</span>
                </summary>
                <ul className="mt-3 divide-y divide-rule border-y border-rule">
                  {runs.slice(VISIBLE_RUNS).map((run) => (
                    <RunRow key={run.id} run={run} />
                  ))}
                </ul>
              </details>
            ) : null}
          </>
        )}
      </Section>
    </div>
  );
}
