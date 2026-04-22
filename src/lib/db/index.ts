import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// In dev, Next's file-watcher can evaluate this module many times per session;
// without this cache we'd open a brand-new socket on every Server Action. In
// prod Vercel keeps one Lambda instance alive between requests, so the module
// evaluates once per container — but caching on globalThis is harmless there
// and guarantees "never create twice" in all environments.
declare global {
  var __uwuPgClient: ReturnType<typeof postgres> | undefined;
}

const queryClient =
  globalThis.__uwuPgClient ??
  postgres(connectionString, {
    prepare: false, // transaction pooler (port 6543) requires this
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__uwuPgClient = queryClient;
}

export const db = drizzle(queryClient, { schema });
export { schema };
export * from "./schema";
