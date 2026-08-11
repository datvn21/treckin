import type { Config } from "drizzle-kit";

export default {
  schema: "./src/database/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://postgres:postgres_dev_pwd@localhost:5432/treckin_db",
  },
  strict: true,
  verbose: true,
} satisfies Config;
