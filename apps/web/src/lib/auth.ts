import { createHash } from "node:crypto";
import { env } from "./env";

export const AUTH_COOKIE = "rw_auth";

/** Cookie value derived from APP_PASSWORD. Null means auth is disabled. */
export function sessionToken(): string | null {
  if (!env.APP_PASSWORD) return null;
  return createHash("sha256").update(`rw-tracker:${env.APP_PASSWORD}`).digest("hex");
}
