import mysql from 'mysql2/promise';

async function test() {
  try {
    const connection = await mysql.createConnection('mysql://root@localhost:3306');
    console.log('Connected as root with no password');
    await connection.query('CREATE DATABASE IF NOT EXISTS aruna_db');
    console.log('Database aruna_db ensured');
    await connection.end();
  } catch (err) {
    console.error('Failed to connect as root with no password:', err.message);
  }
}

test();
