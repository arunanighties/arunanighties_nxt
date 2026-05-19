import { PGlite } from '@electric-sql/pglite';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../../data/pglite');

async function main() {
  console.log("Opening db at", dbPath);
  const db = new PGlite(dbPath);
  
  try {
    await db.query(`ALTER TABLE products ADD COLUMN sizes json NOT NULL DEFAULT '[]'::json;`);
    console.log("Successfully added sizes column!");
  } catch (err) {
    if (err.message.includes("already exists")) {
      console.log("Column sizes already exists.");
    } else {
      console.error("Failed to add column:", err);
    }
  }

  // Add some dummy sizes to Kerala Nighties (or all products) so the user can see it
  try {
    await db.query(`
      UPDATE products 
      SET sizes = '[{"size": "XS", "quantity": 0}, {"size": "S", "quantity": 5}, {"size": "M", "quantity": 10}, {"size": "L", "quantity": 0}, {"size": "XL", "quantity": 2}]'::json
    `);
    console.log("Successfully updated all products with sample sizes!");
  } catch (err) {
    console.error("Failed to update products:", err);
  }

  await db.close();
}

main().catch(console.error);
