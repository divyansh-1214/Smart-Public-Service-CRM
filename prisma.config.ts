import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Neon uses a single connection URL for both CLI commands and migrations.
    // No separate DIRECT_URL is needed (unlike Supabase with PgBouncer).
    url: process.env["DATABASE_URL"] ?? "",
  },
});
