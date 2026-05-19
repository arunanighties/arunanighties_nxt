
import mysql from 'mysql2/promise';

async function listDbs() {
  const url = 'mysql://u411161769_aruna_nighty2:Aruna%23Nighties%231234@srv1636.hstgr.io:3306/u411161769_aruna_nighty2';
  try {
    const connection = await mysql.createConnection(url);
    const [rows] = await connection.query('SHOW DATABASES');
    console.log('Available Databases:', rows);
    
    console.log('\nChecking current database tables again...');
    const [tables] = await connection.query('SHOW TABLES');
    console.log('Tables in u411161769_aruna_nighty2:', tables);

    await connection.end();
  } catch (error) {
    console.error(error);
  }
}

listDbs();
