import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL || "mysql://u411161769_aruna_nighty2:Aruna@2025@127.0.0.1:3306/u411161769_aruna_nighty2";

async function fix() {
  console.log("🚀 Starting Emergency Database Fix...");
  const connection = await mysql.createConnection(DATABASE_URL);

  try {
    // 1. Fix 'users' table
    console.log("Checking 'users' table...");
    const [userCols] = await connection.execute("DESCRIBE `users`").catch(() => [[]]);
    const userFields = userCols.map(c => c.Field);
    
    if (!userFields.includes("phone")) {
      console.log("Adding 'phone' column to 'users'...");
      await connection.execute("ALTER TABLE `users` ADD COLUMN `phone` VARCHAR(20) NOT NULL UNIQUE AFTER `id`").catch(e => console.error("Error adding phone:", e.message));
    }

    if (!userFields.includes("addresses")) {
      console.log("Adding 'addresses' column to 'users'...");
      await connection.execute("ALTER TABLE `users` ADD COLUMN `addresses` TEXT AFTER `email`").catch(e => console.error("Error adding addresses:", e.message));
    }


    // 2. Fix 'reviews' table
    console.log("Checking 'reviews' table...");
    const [reviewCols] = await connection.execute("DESCRIBE `reviews`").catch(() => [[]]);
    if (reviewCols.length === 0) {
        console.log("Table 'reviews' missing. Creating it...");
        await connection.execute(`
            CREATE TABLE \`reviews\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`product_id\` int NOT NULL,
                \`user_id\` int DEFAULT NULL,
                \`user_name\` varchar(255) NOT NULL DEFAULT 'Anonymous',
                \`rating\` int NOT NULL DEFAULT '5',
                \`title\` varchar(255) NOT NULL,
                \`comment\` text NOT NULL,
                \`image_urls\` json NOT NULL,
                \`helpful_count\` int NOT NULL DEFAULT '0',
                \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
    } else {
        const reviewFields = reviewCols.map(c => c.Field);
        if (!reviewFields.includes("user_name")) {
            console.log("Adding 'user_name' column to 'reviews'...");
            await connection.execute("ALTER TABLE `reviews` ADD COLUMN `user_name` VARCHAR(255) NOT NULL DEFAULT 'Anonymous' AFTER `user_id`").catch(e => console.error("Error adding user_name:", e.message));
        }
    }

    console.log("✅ Database fix complete! You can now switch back to index.mjs");
  } catch (err) {
    console.error("❌ Fix failed:", err.message);
  } finally {
    await connection.end();
    process.exit(0);
  }
}

fix();
