import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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
    const [rows] = await connection.execute("SELECT * FROM `orders` WHERE id = 49");
    console.log("Order 49 Details:", JSON.stringify(rows[0], null, 2));

    if (rows[0] && rows[0].items) {
      let items = [];
      try {
        items = typeof rows[0].items === "string" ? JSON.parse(rows[0].items) : rows[0].items;
      } catch (err) {
        console.error("Failed to parse items:", err);
      }
      for (const item of items) {
        console.log("Ordered Product Item details:", item);
        const [prodRows] = await connection.execute("SELECT id, name, stock, sizes, inventory FROM `products` WHERE id = ?", [item.id]);
        console.log("Database Product Details:", JSON.stringify(prodRows[0], null, 2));
      }
    }
  } finally {
    await connection.end();
  }
}

check();
