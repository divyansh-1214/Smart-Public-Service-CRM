import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Use the direct connection URL (port 5432) for CLI commands and migrations.
    // PgBouncer (port 6543) blocks DDL statements required by prisma migrate / db push.
    // DATABASE_URL (pooled) is used only at runtime via the PrismaPg driver adapter.
    url: process.env["DIRECT_URL"] ?? "",
  },
});
