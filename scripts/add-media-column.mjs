import { createClient } from "@libsql/client";
import dotenv from "dotenv";

dotenv.config();

let databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || databaseUrl.startsWith("mysql:") || databaseUrl.startsWith("postgresql:") || databaseUrl.startsWith("postgres:")) {
  databaseUrl = process.env.TURSO_DATABASE_URL;
}

if (!databaseUrl) {
  console.error("Error: Neither DATABASE_URL nor TURSO_DATABASE_URL is set in environment.");
  process.exit(1);
}

const client = createClient({
  url: databaseUrl,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  console.log("Connecting to LibSQL database...");
  try {
    // Check if media column already exists
    const tableInfo = await client.execute("PRAGMA table_info(products);");
    const hasMedia = tableInfo.rows.some((row) => row.name === "media");

    if (hasMedia) {
      console.log("Column 'media' already exists on 'products' table.");
    } else {
      console.log("Adding 'media' column to 'products' table...");
      await client.execute("ALTER TABLE products ADD COLUMN media text;");
      console.log("Successfully added 'media' column to 'products' table.");
    }
  } catch (error) {
    console.error("Migration error:", error);
  } finally {
    client.close();
  }
}

main();
