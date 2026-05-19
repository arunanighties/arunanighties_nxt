import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { productsTable } from './lib/db/src/schema/products.js';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

async function test() {
  try {
    console.log('Attempting to insert a test product...');
    const [result] = await db.insert(productsTable).values({
      name: "Test Product",
      description: "Test Description",
      price: "100.00",
      mrp: "120.00",
      imageUrl: "http://example.com/image.jpg",
      stock: 10,
      reviewText: "Nice",
      images: [],
      sizes: [{ size: "M", quantity: 10 }],
      inventory: {}
    });
    console.log('Insert successful, ID:', result.insertId);
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('Insert failed:');
    console.error(error);
    await connection.end();
    process.exit(1);
  }
}

test();
