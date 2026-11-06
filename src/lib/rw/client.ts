import { log } from "../log";
import type { RouteQuery } from "./types";

const BASE_URL = "https://pass.rw.by";
const TIMEOUT_MS = 20_000;
const MAX_ATTEMPTS = 3;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export class RateLimitedError extends Error {}

export function routePageUrl({ from, to, date }: RouteQuery): string {
  return `${BASE_URL}/ru/route/?${new URLSearchParams({ from, to, date })}`;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Fetches the server-rendered timetable page. Retries network errors and 5xx with backoff. */
export async function fetchRouteHtml(query: RouteQuery): Promise<string> {
  const url = routePageUrl(query);
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, "Accept-Language": "ru-RU,ru;q=0.9" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (response.status === 403 || response.status === 429) {
        throw new RateLimitedError(`HTTP ${response.status} for ${url}`);
      }
      if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
      return await response.text();
    } catch (error) {
      if (error instanceof RateLimitedError) throw error;
      lastError = error;
      log.warn(`Route fetch attempt ${attempt}/${MAX_ATTEMPTS} failed`, String(error));
      if (attempt < MAX_ATTEMPTS) await sleep(2000 * 2 ** (attempt - 1));
    }
  }

  throw lastError;
}
