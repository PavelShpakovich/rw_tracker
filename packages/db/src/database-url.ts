export function isSupabaseDatabaseUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const isPostgres =
      url.protocol === "postgres:" || url.protocol === "postgresql:";
    const isSupabaseHost =
      url.hostname.endsWith(".supabase.co") ||
      url.hostname.endsWith(".pooler.supabase.com");
    return isPostgres && isSupabaseHost;
  } catch {
    return false;
  }
}
