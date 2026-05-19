
import mysql from 'mysql2/promise';

async function checkTypes() {
  const url = 'mysql://u411161769_aruna_nighty2:Aruna%23Nighties%231234@srv1636.hstgr.io:3306/u411161769_aruna_nighty2';
  try {
    const connection = await mysql.createConnection(url);
    const [columns] = await connection.query('DESCRIBE products');
    console.table(columns.map(c => ({ Field: c.Field, Type: c.Type })));
    await connection.end();
  } catch (error) {
    console.error(error);
  }
}

checkTypes();
