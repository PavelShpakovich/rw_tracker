"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Трекеры" },
  { href: "/trackers/new", label: "Новый" },
  { href: "/settings", label: "Настройки" },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return (
      pathname === "/" ||
      (pathname.startsWith("/trackers/") && pathname !== "/trackers/new")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DesktopNavigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Основная навигация"
      className="hidden h-full items-stretch gap-8 md:flex"
    >
      {items.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`relative flex items-center text-sm transition-colors ${
              active
                ? "font-medium text-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            {item.label}
            {active ? (
              <span className="absolute inset-x-0 -bottom-px h-[3px] bg-accent" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNavigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Основная навигация"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-foreground bg-background md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {items.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`relative flex h-14 items-center justify-center text-sm transition-colors ${
              active ? "font-medium text-foreground" : "text-muted"
            }`}
          >
            {active ? (
              <span className="absolute inset-x-0 -top-px h-[3px] bg-accent" />
            ) : null}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
