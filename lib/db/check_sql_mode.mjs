
import mysql from 'mysql2/promise';

async function checkSqlMode() {
  const url = 'mysql://u411161769_aruna_nighty2:Aruna%23Nighties%231234@srv1636.hstgr.io:3306/u411161769_aruna_nighty2';
  try {
    const connection = await mysql.createConnection(url);
    const [rows] = await connection.query('SELECT @@sql_mode as mode');
    console.log('SQL Mode:', rows[0].mode);
    await connection.end();
  } catch (error) {
    console.error(error);
  }
}

checkSqlMode();
