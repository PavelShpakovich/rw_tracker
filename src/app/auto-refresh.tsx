"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface Props {
  intervalMs: number;
}

export function AutoRefresh({ intervalMs }: Props) {
  const router = useRouter();

  useEffect(() => {
    const refresh = () => router.refresh();

    const timer = setInterval(refresh, intervalMs);

    const handleVisibility = () => {
      if (!document.hidden) refresh();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", refresh);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", refresh);
    };
  }, [router, intervalMs]);

  return null;
}
