import { createClient } from '@libsql/client';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const localUrl = 'file:local.db';
const remoteUrl = process.env.TURSO_DATABASE_URL;
const remoteToken = process.env.TURSO_AUTH_TOKEN;

if (!remoteUrl || !remoteToken) {
  console.error("❌ TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set in .env");
  process.exit(1);
}

async function run() {
  console.log("0. Connecting to remote database to clear existing tables...");
  const remoteClientInit = createClient({ url: remoteUrl, authToken: remoteToken });
  try {
    const tablesRes = await remoteClientInit.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_drizzle%';");
    const remoteTables = tablesRes.rows.map(row => row.name);
    if (remoteTables.length > 0) {
      console.log(`Found remote tables to drop: ${remoteTables.join(', ')}`);
      for (const table of remoteTables) {
        console.log(`Dropping remote table "${table}"...`);
        await remoteClientInit.execute(`DROP TABLE IF EXISTS "${table}"`);
      }
      console.log("✓ Remote database cleared.");
    } else {
      console.log("No remote tables found to drop.");
    }
  } catch (e) {
    console.warn("⚠️ Failed to clear remote tables:", e.message);
  } finally {
    remoteClientInit.close();
  }

  console.log("\n1. Pushing schema to Turso using drizzle-kit...");
  try {
    execSync('npx drizzle-kit push --force', {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: remoteUrl,
        TURSO_AUTH_TOKEN: remoteToken
      }
    });
    console.log("✓ Schema pushed to Turso.");
  } catch (error) {
    console.error("❌ Failed to push schema:", error.message);
    process.exit(1);
  }

  console.log("\n2. Connecting to local and remote databases...");
  const localClient = createClient({ url: localUrl });
  const remoteClient = createClient({ url: remoteUrl, authToken: remoteToken });

  const tables = [
    'categories',
    'homepage_sections',
    'products',
    'users',
    'orders',
    'reviews',
    'site_settings'
  ];

  for (const table of tables) {
    console.log(`\nMigrating table: ${table}...`);
    
    // Fetch local data
    let localRows;
    try {
      const result = await localClient.execute(`SELECT * FROM "${table}"`);
      localRows = result.rows;
    } catch (e) {
      console.warn(`⚠️ Table "${table}" does not exist in local.db or has no rows. Skipping.`);
      continue;
    }
    
    console.log(`Found ${localRows.length} rows in local "${table}" table.`);

    // Clear remote table first
    console.log(`Clearing existing rows in remote "${table}"...`);
    await remoteClient.execute(`DELETE FROM "${table}"`);

    if (localRows.length === 0) continue;

    // Fetch remote columns to filter out legacy local columns
    const schemaInfo = await remoteClient.execute(`PRAGMA table_info("${table}");`);
    const remoteColumns = schemaInfo.rows.map(r => r.name);
    console.log(`Remote table columns: ${remoteColumns.join(', ')}`);

    // Build batch insertions using only matching columns
    const columns = Object.keys(localRows[0]).filter(col => remoteColumns.includes(col));
    console.log(`Copying matching columns: ${columns.join(', ')}`);
    const batch = [];
    
    for (const row of localRows) {
      const values = columns.map(col => {
        let val = row[col];
        if (typeof val === 'boolean') {
          return val ? 1 : 0;
        }
        return val;
      });

      batch.push({
        sql: `INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
        args: values
      });
    }

    // Execute batch
    if (batch.length > 0) {
      console.log(`Pushing ${batch.length} rows to remote "${table}"...`);
      // If the batch size is very large, split it, but for our database it should be fine
      await remoteClient.batch(batch, "write");
    }
    console.log(`✓ Table "${table}" migrated successfully.`);
  }

  console.log("\n🎉 Database sync to Turso complete!");
}

run().catch(err => {
  console.error("❌ Database sync failed:", err);
  process.exit(1);
});
