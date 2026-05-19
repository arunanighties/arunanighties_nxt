import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

console.log("Database connection initializing with URL:", databaseUrl.replace(/:[^:@]+@/, ":****@"));

// Use a pool instead of a single connection to prevent blocking startup
const poolRaw = mysql.createPool(databaseUrl);

// Add a simple error logger to the pool's query/execute methods
const pool = new Proxy(poolRaw, {
  get(target: any, prop: string) {
    const value = target[prop];
    
    // WORKAROUND: Force 'execute' to use 'query' to avoid MariaDB prepared statement issues on Hostinger
    const methodToUse = prop === "execute" ? "query" : prop;
    const originalMethod = target[methodToUse];

    if (typeof originalMethod === "function" && (prop === "execute" || prop === "query")) {
      return async (...args: any[]) => {
        try {
          // If we're forcing 'execute' to 'query', we just use the same args
          return await originalMethod.apply(target, args);
        } catch (error: any) {
          console.error(`DATABASE ERROR [${prop} -> ${methodToUse}]:`, {
            message: error.message,
            code: error.code,
            errno: error.errno,
            sql: error.sql
          });
          throw error;
        }
      };
    }
    return value;
  }
});

export const db = drizzle(pool as any, { schema, mode: "default" });

export * from "./schema";
