import mysql from "mysql2/promise";

const databaseUrl = "mysql://u411161769_aruna_nighty2:ArunaNighties6309@srv1636.hstgr.io:3306/u411161769_aruna_nighty2";

async function run() {
  try {
    const connection = await mysql.createConnection(databaseUrl);
    console.log("Connected to database.");

    console.log("Altering users table to allow NULL emails...");
    await connection.query("ALTER TABLE users MODIFY email varchar(255) NULL DEFAULT NULL");
    console.log("Table successfully altered!");

    console.log("\nVerifying schema...");
    const [columns] = await connection.query("DESCRIBE users");
    console.table(columns);

    await connection.end();
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
