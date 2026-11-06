import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="space-y-10" role="status" aria-label="Загрузка">
      <Skeleton className="h-12 w-56" />
      <div className="grid grid-cols-3 gap-8 border-y border-foreground py-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
      <div className="space-y-12">
        {[0, 1].map((i) => (
          <div key={i} className="space-y-5">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-16 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
