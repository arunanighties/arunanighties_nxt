import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

// Determine the database URL, falling back to TURSO_DATABASE_URL if DATABASE_URL is missing
// or is an unsupported legacy protocol (like mysql/postgres)
let databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || databaseUrl.startsWith("mysql:") || databaseUrl.startsWith("postgresql:") || databaseUrl.startsWith("postgres:")) {
  databaseUrl = process.env.TURSO_DATABASE_URL;
}

if (!databaseUrl) {
  throw new Error("Neither DATABASE_URL nor TURSO_DATABASE_URL is set");
}

console.log("Database connection initializing with URL:", databaseUrl.replace(/:[^:@]+@/, ":****@"));

const client = createClient({
  url: databaseUrl,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });

export * from "./schema";
