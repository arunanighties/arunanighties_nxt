import mysql from 'mysql2/promise';

async function debug() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  console.log('--- PRODUCTS TABLE ---');
  const [products] = await conn.execute('DESCRIBE products');
  console.log(JSON.stringify(products, null, 2));
  
  console.log('--- HOMEPAGE_SECTIONS TABLE ---');
  const [sections] = await conn.execute('DESCRIBE homepage_sections');
  console.log(JSON.stringify(sections, null, 2));
  
  await conn.end();
}

debug();
