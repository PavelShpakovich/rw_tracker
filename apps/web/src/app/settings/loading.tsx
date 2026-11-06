import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="space-y-14" role="status" aria-label="Загрузка">
      <Skeleton className="h-12 w-48" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-4 border-t border-foreground pt-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-2/3" />
        </div>
      ))}
    </div>
  );
}
