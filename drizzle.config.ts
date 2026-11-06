import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  schemaFilter: ["rw"],
  dbCredentials: { url: process.env.DATABASE_URL ?? "pglite:./data/pg" },
});
