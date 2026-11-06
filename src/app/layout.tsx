import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="border-b border-black/10 dark:border-white/10">
          <nav className="mx-auto flex max-w-4xl items-center gap-6 px-4 py-3 text-sm">
            <Link href="/" className="font-semibold">RW Tracker</Link>
            <Link href="/" className="opacity-70 hover:opacity-100">Трекеры</Link>
            <Link href="/trackers/new" className="opacity-70 hover:opacity-100">Новый трекер</Link>
            <Link href="/settings" className="opacity-70 hover:opacity-100">Настройки</Link>
          </nav>
        </header>
        <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">{children}</div>
      </body>
    </html>
  );
}
