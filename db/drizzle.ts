import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

// Singleton pattern — prevents connection exhaustion during Next.js dev hot reloads
const globalForDb = globalThis as unknown as { pgClient: postgres.Sql | undefined };

const client =
  globalForDb.pgClient ??
  postgres(connectionString, {
    prepare: false,
    max: 5, // cap concurrent connections
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pgClient = client;
}

export const db = drizzle(client, { schema });
