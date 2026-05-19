import mysql from "mysql2/promise";

const databaseUrl = "mysql://u411161769_aruna_nighty2:ArunaNighties6309@srv1636.hstgr.io:3306/u411161769_aruna_nighty2";

async function run() {
  try {
    const connection = await mysql.createConnection(databaseUrl);
    console.log("Connected to database.");

    console.log("\nDescribing users table...");
    const [columns] = await connection.query("DESCRIBE users");
    console.table(columns);

    console.log("\nShowing indexes...");
    const [indexes] = await connection.query("SHOW INDEX FROM users");
    console.table(indexes);

    await connection.end();
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
