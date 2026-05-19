import mysql from 'mysql2/promise';

async function createDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const url = new URL(databaseUrl);
  const dbName = url.pathname.slice(1);
  const baseUrl = `${url.protocol}//${url.username}${url.password ? `:${url.password}` : ''}@${url.host}`;

  try {
    const connection = await mysql.createConnection(baseUrl);
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
    console.log(`Database ${dbName} created or already exists.`);
    await connection.end();
  } catch (err) {
    console.error('Failed to create database:', err.message);
    process.exit(1);
  }
}

createDb();
