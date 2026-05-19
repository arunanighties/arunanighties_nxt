import { PGlite } from "@electric-sql/pglite";

async function checkDb() {
  try {
    const db = new PGlite("../../data/pglite");
    await db.waitReady;
    
    console.log("Database connection successful.");
    
    // Check tables
    const tables = ['products', 'users', 'categories', 'homepage_sections', 'orders'];
    let hasData = false;
    
    for (const table of tables) {
      try {
        const res = await db.query(`SELECT count(*) as count FROM ${table}`);
        const count = res.rows[0].count;
        console.log(`- ${table}: ${count} rows`);
        if (Number(count) > 0) hasData = true;
      } catch (err) {
        console.log(`- ${table}: Error or table doesn't exist`);
      }
    }
    
    if (!hasData) {
      console.log("\nConclusion: The database is currently empty.");
    } else {
      console.log("\nConclusion: The database contains data.");
    }
    
    process.exit(0);
  } catch (error) {
    console.error("Error connecting to db:", error);
    process.exit(1);
  }
}

checkDb();
