
import mysql from 'mysql2/promise';

async function fixDb() {
  const url = 'mysql://u411161769_aruna_nighty2:Aruna%23Nighties%231234@srv1636.hstgr.io:3306/u411161769_aruna_nighty2';
  console.log('Connecting to remote DB...');
  
  try {
    const connection = await mysql.createConnection(url);
    console.log('Connected!');

    // Check products table
    console.log('\nChecking products table...');
    const [columns] = await connection.query('DESCRIBE products');
    const columnNames = columns.map(c => c.Field);
    console.log('Current columns:', columnNames);

    const requiredColumns = [
      'id', 'name', 'description', 'image_url', 'stock', 'category_id', 'section_id', 
      'rating', 'review_count', 'review_text', 'images', 'sizes', 'inventory', 
      'created_at', 'updated_at'
    ];

    for (const col of requiredColumns) {
      if (!columnNames.includes(col)) {
        console.log(`Missing column: ${col}. Attempting to add...`);
        if (col === 'inventory') {
            await connection.query('ALTER TABLE products ADD COLUMN inventory JSON DEFAULT NULL');
        } else if (col === 'section_id') {
            await connection.query('ALTER TABLE products ADD COLUMN section_id INT DEFAULT NULL');
        } else if (col === 'updated_at') {
            await connection.query('ALTER TABLE products ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
        }
        // Add others as needed, but inventory and section_id are the most likely suspects
      }
    }

    // Check site_settings table
    console.log('\nChecking site_settings table...');
    try {
        const [settingsColumns] = await connection.query('DESCRIBE site_settings');
        console.log('site_settings columns:', settingsColumns.map(c => c.Field));
    } catch (e) {
        console.log('site_settings table might be missing. Error:', e.message);
        if (e.message.includes("doesn't exist")) {
            console.log('Creating site_settings table...');
            await connection.query(`
                CREATE TABLE site_settings (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    \`key\` VARCHAR(255) NOT NULL UNIQUE,
                    value TEXT NOT NULL,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);
        }
    }

    // Check homepage_sections table
    console.log('\nChecking homepage_sections table...');
    try {
        const [sectionColumns] = await connection.query('DESCRIBE homepage_sections');
        console.log('homepage_sections columns:', sectionColumns.map(c => c.Field));
    } catch (e) {
        console.log('homepage_sections table might be missing. Error:', e.message);
        if (e.message.includes("doesn't exist")) {
            console.log('Creating homepage_sections table...');
            await connection.query(`
                CREATE TABLE homepage_sections (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL UNIQUE,
                    position INT NOT NULL DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
        }
    }

    console.log('\nSync complete!');
    await connection.end();
  } catch (error) {
    console.error('Fatal Error:', error);
  }
}

fixDb();
