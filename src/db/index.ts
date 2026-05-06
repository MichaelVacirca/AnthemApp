import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
}

const globalForDb = globalThis as unknown as { client?: ReturnType<typeof postgres> };

const client =
  globalForDb.client ??
  postgres(url, {
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.client = client;
}

export const db = drizzle(client, { schema });
export type DB = typeof db;
export { schema };
