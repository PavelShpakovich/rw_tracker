import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { formatDateTime } from "@rw/core/format";
import { getWorkerStatus } from "@rw/db/trackers";
import "./globals.css";
import { AutoRefresh } from "./auto-refresh";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
  themeColor: "#000000",
};

async function WorkerStatus() {
  let status: { holder: string; expiresAt: Date } | null = null;
  try {
    status = await getWorkerStatus();
  } catch {
    // DB not ready yet
  }

  const now = new Date();
  const isOnline = status && status.expiresAt > now;

  return (
    <span className="ml-auto text-xs opacity-60">
      {isOnline
        ? `Воркер: онлайн (${status!.holder.split(":")[0]})`
        : status
          ? `Воркер: офлайн с ${formatDateTime(status.expiresAt)}`
          : "Воркер: офлайн"}
    </span>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AutoRefresh intervalMs={15000} />
        <header className="border-b border-black/10 dark:border-white/10">
          <nav className="mx-auto flex max-w-4xl flex-wrap items-center gap-4 px-4 py-3 text-sm">
            <Link href="/" className="font-semibold">RW Tracker</Link>
            <Link href="/" className="opacity-70 hover:opacity-100">Трекеры</Link>
            <Link href="/trackers/new" className="opacity-70 hover:opacity-100">Новый трекер</Link>
            <Link href="/settings" className="opacity-70 hover:opacity-100">Настройки</Link>
            <WorkerStatus />
          </nav>
        </header>
        <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">{children}</div>
      </body>
    </html>
  );
}
