
import mysql from 'mysql2/promise';

async function checkVersion() {
  const url = 'mysql://u411161769_aruna_nighty2:Aruna%23Nighties%231234@srv1636.hstgr.io:3306/u411161769_aruna_nighty2';
  try {
    const connection = await mysql.createConnection(url);
    const [rows] = await connection.query('SELECT VERSION() as version');
    console.log('MySQL Version:', rows[0].version);
    await connection.end();
  } catch (error) {
    console.error(error);
  }
}

checkVersion();
