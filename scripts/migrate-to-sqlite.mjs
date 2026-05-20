import mysql from 'mysql2/promise';
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const MYSQL_URL = process.env.DATABASE_URL;
if (!MYSQL_URL) {
  console.error("DATABASE_URL must be set to the MySQL connection string");
  process.exit(1);
}

console.log("Connecting to MySQL Database...");

async function migrate() {
  const connection = await mysql.createConnection(MYSQL_URL);
  
  const sqliteDbPath = './local.db';
  if (fs.existsSync(sqliteDbPath)) {
    fs.unlinkSync(sqliteDbPath);
  }
  
  const sqlite = createClient({ url: 'file:local.db' });
  console.log("Created local.db");

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
    
    const [rows] = await connection.query(`SELECT * FROM ${table}`);
    console.log(`Found ${rows.length} rows in ${table}`);

    if (rows.length === 0) continue;

    const columns = Object.keys(rows[0]);
    
    const createCols = columns.map(col => `"${col}" TEXT`).join(', ');
    await sqlite.execute(`CREATE TABLE IF NOT EXISTS "${table}" (${createCols})`);

    let count = 0;
    
    const batch = [];
    for (const item of rows) {
      const values = columns.map(col => {
        let val = item[col];
        if (val instanceof Date) {
          return val.getTime();
        }
        if (typeof val === 'object' && val !== null) {
          return JSON.stringify(val);
        }
        if (typeof val === 'boolean') {
          return val ? 1 : 0;
        }
        if (val === undefined || val === null) {
          return null;
        }
        return val;
      });
      
      batch.push({
        sql: `INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
        args: values
      });
      count++;
    }
    
    if (batch.length > 0) {
      await sqlite.batch(batch, "write");
    }

    console.log(`Inserted ${count} rows into ${table}`);
  }

  await connection.end();
  console.log("\nMigration complete! Data written to local.db");
}

migrate().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
