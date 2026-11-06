import { env } from "@/lib/env";
import { tomorrowInMinsk } from "@rw/core/format";
import { getRouteSearch } from "@rw/db/trackers";
import type { TrainInfo } from "@rw/core/rw-types";
import { AutoRefresh } from "../../auto-refresh";
import { createTrackersAction, searchRouteAction } from "../../actions";
import { RouteSearchPanel, TrackerWizard } from "@/components/tracker-builder";
import { Empty, Notice, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

interface SearchParams {
  from?: string;
  to?: string;
  date?: string;
  error?: string;
  search?: string;
}

export default async function NewTrackerPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { from, to, date, error, search: searchId } = await searchParams;

  let trains: TrainInfo[] | null = null;
  let loadError: string | null = null;
  let isPending = false;
  let isWorkerOffline = false;
  let searched: { from: string; to: string; date: string } | null = null;

  if (searchId) {
    const searchRecord = await getRouteSearch(Number(searchId));
    if (searchRecord) {
      searched = {
        from: searchRecord.fromName,
        to: searchRecord.toName,
        date: searchRecord.date,
      };
      if (searchRecord.status === "pending") {
        isPending = true;
        const ageMs = new Date().getTime() - searchRecord.createdAt.getTime();
        if (ageMs > 30_000) isWorkerOffline = true;
      } else if (searchRecord.status === "done") {
        trains = searchRecord.result as unknown as TrainInfo[];
      } else if (searchRecord.status === "error") {
        loadError = searchRecord.error ?? "Неизвестная ошибка";
      }
    }
  }

  const fromVal = searched?.from ?? from ?? "";
  const toVal = searched?.to ?? to ?? "";
  const dateVal = searched?.date ?? date ?? "";

  return (
    <div className="space-y-10">
      {isPending && !isWorkerOffline && <AutoRefresh intervalMs={2000} />}
      <PageHeader
        title="Новый трекер"
        description="Маршрут, поезда и условия уведомлений."
      />

      <RouteSearchPanel
        action={searchRouteAction}
        compact={searched !== null}
        from={fromVal}
        to={toVal}
        date={dateVal || tomorrowInMinsk()}
      />

      {error === "none" ? (
        <Notice tone="warn" role="alert">
          Отметьте хотя бы один поезд и тип мест.
        </Notice>
      ) : null}
      {isPending && !isWorkerOffline ? (
        <p role="status" className="animate-pulse font-mono text-sm text-muted">
          ищем поезда…
        </p>
      ) : null}
      {isWorkerOffline ? (
        <Notice tone="warn">
          Воркер не запущен, поэтому поиск не выполняется. Запустите{" "}
          <code className="font-mono">pnpm worker</code>.
        </Notice>
      ) : null}
      {loadError ? (
        <Notice tone="danger" role="alert">
          Не удалось загрузить расписание: {loadError}
        </Notice>
      ) : null}
      {trains?.length === 0 ? (
        <Empty
          title="Поезда не найдены"
          description="Проверьте станции и дату, затем попробуйте ещё раз."
        />
      ) : null}

      {trains && trains.length > 0 ? (
        <TrackerWizard
          action={createTrackersAction}
          trains={trains}
          from={fromVal}
          to={toVal}
          date={dateVal}
          defaultIntervalSec={env.DEFAULT_INTERVAL_SEC}
        />
      ) : null}
    </div>
  );
}
