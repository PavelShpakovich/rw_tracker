import { defineConfig } from "drizzle-kit";
import { isSupabaseDatabaseUrl } from "./src/database-url";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || !isSupabaseDatabaseUrl(databaseUrl)) {
  throw new Error(
    "DATABASE_URL must be a Supabase PostgreSQL connection string.",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./drizzle",
  schemaFilter: ["rw"],
  dbCredentials: { url: databaseUrl },
});
