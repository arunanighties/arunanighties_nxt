
import mysql from 'mysql2/promise';

async function testQueries() {
  const url = 'mysql://u411161769_aruna_nighty2:Aruna%23Nighties%231234@srv1636.hstgr.io:3306/u411161769_aruna_nighty2';
  console.log('Connecting to remote DB...');
  
  try {
    const connection = await mysql.createConnection(url);
    console.log('Connected!');

    const queries = [
      "select `id`, `name`, `description`, `image_url`, `stock`, `category_id`, `section_id`, `rating`, `review_count`, `review_text`, `images`, `sizes`, `inventory`, `created_at`, `updated_at` from `products` order by `products`.`created_at`",
      "select `id`, `key`, `value`, `updated_at` from `site_settings`",
      "select `id`, `name`, `position`, `created_at` from `homepage_sections` order by `homepage_sections`.`position` asc, `homepage_sections`.`created_at` asc"
    ];

    for (const sql of queries) {
        console.log(`\nTesting query: ${sql.substring(0, 50)}...`);
        try {
            const [rows] = await connection.execute(sql);
            console.log(`Success! Found ${rows.length} rows.`);
        } catch (e) {
            console.error(`FAILED: ${e.message}`);
            console.error(`Code: ${e.code}, Errno: ${e.errno}, SqlState: ${e.sqlState}`);
        }
    }

    await connection.end();
  } catch (error) {
    console.error('Fatal Error:', error);
  }
}

testQueries();
