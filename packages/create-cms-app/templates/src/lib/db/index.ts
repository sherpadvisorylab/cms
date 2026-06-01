import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Singleton pattern: reuse the same connection pool across Next.js hot reloads.
// Without this, each hot reload opens a new pool and exhausts Supabase free-tier
// connection slots (max ~20).
const globalForDb = globalThis as unknown as {
  client: ReturnType<typeof postgres> | undefined;
};

export const client =
  globalForDb.client ??
  postgres(connectionString, {
    max: 3,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false, // required for Supabase pgBouncer (port 6543)
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.client = client;
}

export const db = drizzle(client, { schema });
