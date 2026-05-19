import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env manually
const envPath = path.join(__dirname, ".env");
let databaseUrl = "";

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  const match = envContent.match(/DATABASE_URL=(.*)/);
  if (match) {
    databaseUrl = match[1].trim().replace(/^["']|["']$/g, "");
  }
}

if (!databaseUrl) {
  console.error("❌ DATABASE_URL not found in .env");
  process.exit(1);
}

async function run() {
  console.log("🚀 Attempting to add shipping_details column to orders table...");
  const connection = await mysql.createConnection(databaseUrl);

  try {
    const [cols] = await connection.execute("DESCRIBE `orders`").catch(() => [[]]);
    const fields = cols.map(c => c.Field);

    if (!fields.includes("shipping_details")) {
      console.log("Adding 'shipping_details' column...");
      // Using LONGTEXT as a safe alternative to JSON if the MySQL version is older, 
      // but 'json' usually works in modern MariaDB/MySQL. 
      // Xpressbees/MariaDB often prefers JSON or TEXT for json types in Drizzle.
      await connection.execute("ALTER TABLE `orders` ADD COLUMN `shipping_details` JSON AFTER `awb_number`")
        .catch(async (e) => {
           console.log("JSON type might not be supported, trying LONGTEXT...");
           await connection.execute("ALTER TABLE `orders` ADD COLUMN `shipping_details` LONGTEXT AFTER `awb_number`")
        });
      console.log("✅ Column added successfully!");
    } else {
      console.log("ℹ️ Column 'shipping_details' already exists.");
    }
  } catch (err) {
    console.error("❌ Failed to update database:", err.message);
  } finally {
    await connection.end();
    process.exit(0);
  }
}

run();
