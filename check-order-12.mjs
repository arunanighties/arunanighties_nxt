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

async function check() {
  const connection = await mysql.createConnection(databaseUrl);
  try {
    const [rows] = await connection.execute("SELECT id, status, awb_number, shipping_details FROM `orders` WHERE id = 12");
    console.log("Order 12 Details:", JSON.stringify(rows[0], null, 2));
  } finally {
    await connection.end();
  }
}

check();
