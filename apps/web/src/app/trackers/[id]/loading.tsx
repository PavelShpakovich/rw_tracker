import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="space-y-12" role="status" aria-label="Загрузка">
      <div className="space-y-5">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-14 w-full" />
      </div>
      <Skeleton className="h-14 w-full" />
      <div className="grid grid-cols-3 gap-8">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}
