import Link from "next/link";
import { formatAgeShort, plural } from "@rw/core/format";
import { listSeatStates, listTrackers } from "@rw/db/trackers";
import { requestCheckAction } from "./actions";
import { AutoRefresh } from "./auto-refresh";
import { SubmitButton } from "@/components/form-controls";
import { TrackerCard, trackerHasSeats } from "@/components/tracker-card";
import {
  Empty,
  Figure,
  Notice,
  PageHeader,
  Section,
  buttonClassName,
} from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const trackers = await listTrackers();
  const states = await listSeatStates();
  const now = new Date();

  const statesByTracker = new Map<number, typeof states>();
  for (const state of states) {
    const list = statesByTracker.get(state.trackerId) ?? [];
    list.push(state);
    statesByTracker.set(state.trackerId, list);
  }

  const active = trackers.filter((tracker) => tracker.active);
  const withSeats = trackers.filter((tracker) =>
    trackerHasSeats(tracker, statesByTracker.get(tracker.id) ?? []),
  );
  const hasPending = trackers.some((tracker) => tracker.forceCheckAt !== null);
  const lastCheck = trackers.reduce<Date | null>(
    (latest, tracker) =>
      tracker.lastSuccessAt && (!latest || tracker.lastSuccessAt > latest)
        ? tracker.lastSuccessAt
        : latest,
    null,
  );

  // One notice per distinct error instead of repeating it on every row.
  const errors = new Map<string, number>();
  for (const tracker of active) {
    if (tracker.lastError) {
      errors.set(tracker.lastError, (errors.get(tracker.lastError) ?? 0) + 1);
    }
  }

  return (
    <div className="space-y-10">
      {hasPending ? <AutoRefresh intervalMs={2000} /> : null}
      <PageHeader
        title="Трекеры"
        description="Следим за свободными местами и сообщаем, когда они появятся."
        actions={
          <Link
            href="/trackers/new"
            className={buttonClassName({ variant: "primary" })}
          >
            Новый трекер
          </Link>
        }
      />

      {trackers.length === 0 ? (
        <Empty
          title="Пока ничего не отслеживается"
          description="Выберите маршрут и типы мест, за которыми нужно следить."
          action={
            <Link
              href="/trackers/new"
              className={buttonClassName({ variant: "primary" })}
            >
              Создать трекер
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-3 divide-x divide-rule border-t border-foreground [&>*]:py-5 [&>*:not(:first-child)]:pl-4 sm:[&>*:not(:first-child)]:pl-8">
            <Figure
              label="Активны"
              size="md"
              value={`${active.length}/${trackers.length}`}
              detail={
                trackers.length > active.length
                  ? `${trackers.length - active.length} на паузе`
                  : "все в работе"
              }
            />
            <Figure
              label="Есть места"
              size="md"
              value={withSeats.length}
              tone={withSeats.length > 0 ? "hit" : "none"}
              detail={withSeats.length > 0 ? "прямо сейчас" : "пока нет"}
            />
            <Figure
              label="Проверка"
              size="md"
              value={lastCheck ? formatAgeShort(lastCheck, now) : "—"}
              detail={lastCheck ? "назад" : "ещё не было"}
            />
          </div>

          {errors.size > 0 ? (
            <div className="space-y-3">
              {[...errors].map(([message, count]) => (
                <Notice key={message} tone="danger">
                  Проверка не удалась у {count}{" "}
                  {plural(count, "трекера", "трекеров", "трекеров")}:{" "}
                  {message}
                </Notice>
              ))}
            </div>
          ) : null}

          <Section
            title="Все трекеры"
            meta={
              <form action={requestCheckAction}>
                <input type="hidden" name="id" value="all" />
                <SubmitButton
                  variant="ghost"
                  size="sm"
                  disabled={active.length === 0}
                >
                  Проверить все
                </SubmitButton>
              </form>
            }
          >
            <ul className="divide-y divide-rule">
              {trackers.map((tracker) => (
                <li key={tracker.id} className="py-7 first:pt-0 last:pb-0">
                  <TrackerCard
                    tracker={tracker}
                    seats={statesByTracker.get(tracker.id) ?? []}
                  />
                </li>
              ))}
            </ul>
          </Section>
        </>
      )}
    </div>
  );
}
