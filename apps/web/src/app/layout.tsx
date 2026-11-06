import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { formatDateTime } from "@rw/core/format";
import { getWorkerStatus } from "@rw/db/trackers";
import { Skeleton, Status } from "@/components/ui";
import { DesktopNavigation, MobileNavigation } from "@/components/navigation";
import "./globals.css";
import { AutoRefresh } from "./auto-refresh";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "RW Tracker",
  description: "Отслеживание свободных мест на поезда БЖД",
  appleWebApp: {
    capable: true,
    title: "RW Tracker",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2efe6" },
    { media: "(prefers-color-scheme: dark)", color: "#101112" },
  ],
};

async function WorkerStatus() {
  let status: { holder: string; expiresAt: Date } | null = null;
  try {
    status = await getWorkerStatus();
  } catch {
    // DB not ready yet
  }

  const isOnline = Boolean(status && status.expiresAt > new Date());
  const description = isOnline
    ? `Онлайн: ${status?.holder.split(":")[0] ?? "воркер"}`
    : status
      ? `Офлайн с ${formatDateTime(status.expiresAt)}`
      : "Воркер не запущен";

  return (
    <Status tone={isOnline ? "ok" : "warn"} pulse={isOnline} title={description}>
      <span className="hidden sm:inline">воркер&nbsp;</span>
      {isOnline ? "онлайн" : "офлайн"}
    </Status>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ru"
      suppressHydrationWarning
      className={`${plexSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <AutoRefresh intervalMs={15000} />
        <header className="sticky top-0 z-30 border-b border-rule bg-background">
          <div className="mx-auto flex h-16 max-w-5xl items-center gap-10 px-4 sm:px-6 lg:px-8">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="grid h-7 w-9 place-items-center rounded-ui bg-accent font-mono text-sm font-semibold text-accent-foreground">
                RW
              </span>
              <span className="text-sm font-semibold tracking-tight">Tracker</span>
            </Link>
            <DesktopNavigation />
            <div className="ml-auto flex shrink-0 items-center">
              <Suspense fallback={<Skeleton className="h-3 w-24" />}>
                <WorkerStatus />
              </Suspense>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-10 sm:px-6 sm:pt-14 md:pb-20 lg:px-8">
          {children}
        </main>
        <MobileNavigation />
      </body>
    </html>
  );
}
