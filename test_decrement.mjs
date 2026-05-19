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

async function test() {
  console.log("Testing stock decrement logic using pure mysql2...");
  const connection = await mysql.createConnection(databaseUrl);
  try {
    const prodId = 5;
    const qtyOrdered = 4;
    const item = { size: "XS", color: "Sea Blue" };

    // Fetch current product details from db
    const [rows] = await connection.execute("SELECT id, name, stock, sizes, inventory FROM `products` WHERE id = ?", [prodId]);
    const product = rows[0];

    if (product) {
      console.log("Product found:", product.name);
      let currentStock = product.stock ?? 0;
      let currentSizes = product.sizes;
      let currentInventory = product.inventory;

      console.log("Before: stock =", currentStock, "sizes =", typeof currentSizes, currentSizes, "inventory =", typeof currentInventory, currentInventory);

      // Parse JSON columns if they are strings
      if (typeof currentSizes === "string") {
        try { currentSizes = JSON.parse(currentSizes); } catch { currentSizes = []; }
      }
      if (!Array.isArray(currentSizes)) currentSizes = [];

      if (typeof currentInventory === "string") {
        try { currentInventory = JSON.parse(currentInventory); } catch { currentInventory = {}; }
      }
      if (!currentInventory || typeof currentInventory !== "object") currentInventory = {};

      // 1. Decrement overall stock
      const nextStock = Math.max(0, currentStock - qtyOrdered);

      // 2. Decrement sizes array quantity (case-insensitively)
      const nextSizes = currentSizes.map((s) => {
        if (item.size && String(s.size).toUpperCase() === String(item.size).toUpperCase()) {
          return { ...s, quantity: Math.max(0, (s.quantity ?? 0) - qtyOrdered) };
        }
        return s;
      });

      // 3. Decrement nested inventory (size -> color) quantity (case-insensitively)
      const nextInventory = { ...currentInventory };
      if (item.size && item.color) {
        const sizeKeys = Object.keys(nextInventory);
        const matchedSizeKey = sizeKeys.find(k => k.toUpperCase() === String(item.size).toUpperCase());
        if (matchedSizeKey) {
          const colorKeys = Object.keys(nextInventory[matchedSizeKey] || {});
          const matchedColorKey = colorKeys.find(c => c.toUpperCase() === String(item.color).toUpperCase());
          if (matchedColorKey) {
            nextInventory[matchedSizeKey][matchedColorKey].qty = Math.max(0, (nextInventory[matchedSizeKey][matchedColorKey].qty ?? 0) - qtyOrdered);
          }
        }
      }

      console.log("After (calculated): stock =", nextStock, "sizes =", nextSizes, "inventory =", nextInventory);

      // Update product record in db
      console.log("Updating database...");
      await connection.execute(
        "UPDATE `products` SET stock = ?, sizes = ?, inventory = ? WHERE id = ?",
        [nextStock, JSON.stringify(nextSizes), JSON.stringify(nextInventory), prodId]
      );

      console.log("Update complete!");

      // Fetch again to verify
      const [updatedRows] = await connection.execute("SELECT id, name, stock, sizes, inventory FROM `products` WHERE id = ?", [prodId]);
      const updatedProduct = updatedRows[0];

      console.log("After (fetched from db): stock =", updatedProduct.stock, "sizes =", updatedProduct.sizes, "inventory =", updatedProduct.inventory);
    } else {
      console.error("Product not found");
    }
  } finally {
    await connection.end();
  }
}

test();
