
import mysql from 'mysql2/promise';

async function manualSync() {
  const url = 'mysql://u411161769_aruna_nighty2:Aruna%23Nighties%231234@srv1636.hstgr.io:3306/u411161769_aruna_nighty2';
  try {
    const connection = await mysql.createConnection(url);
    console.log('Connected!');

    // 1. Drop tables in correct order
    console.log('Dropping tables...');
    const tablesToDrop = ['reviews', 'order_items', 'orders', 'products', 'categories', 'site_settings', 'homepage_sections', 'users'];
    for (const table of tablesToDrop) {
        try {
            await connection.query(`DROP TABLE IF EXISTS ${table}`);
            console.log(`Dropped ${table}`);
        } catch (e) {
            console.log(`Failed to drop ${table}: ${e.message}`);
        }
    }

    // 2. Create tables using the schema definitions
    console.log('\nCreating tables...');

    await connection.query(`
        CREATE TABLE users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) NOT NULL UNIQUE,
            password TEXT NOT NULL,
            name VARCHAR(255) NOT NULL,
            role VARCHAR(50) NOT NULL DEFAULT 'user',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log('Created users');

    await connection.query(`
        CREATE TABLE categories (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log('Created categories');

    await connection.query(`
        CREATE TABLE homepage_sections (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            position INT NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log('Created homepage_sections');

    await connection.query(`
        CREATE TABLE products (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            image_url TEXT NOT NULL,
            stock INT NOT NULL DEFAULT 0,
            category_id INT,
            section_id INT,
            rating DECIMAL(3,1) NOT NULL DEFAULT 4.3,
            review_count INT NOT NULL DEFAULT 1,
            review_text TEXT NOT NULL,
            images JSON NOT NULL,
            sizes JSON NOT NULL,
            inventory JSON,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
            FOREIGN KEY (section_id) REFERENCES homepage_sections(id) ON DELETE SET NULL
        )
    `);
    console.log('Created products');

    await connection.query(`
        CREATE TABLE site_settings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            \`key\` VARCHAR(255) NOT NULL UNIQUE,
            value TEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);
    console.log('Created site_settings');

    await connection.query(`
        CREATE TABLE orders (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT,
            total_amount DECIMAL(10,2) NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'pending',
            shipping_address TEXT NOT NULL,
            payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )
    `);
    console.log('Created orders');

    await connection.query(`
        CREATE TABLE reviews (
            id INT AUTO_INCREMENT PRIMARY KEY,
            product_id INT NOT NULL,
            user_id INT,
            rating INT NOT NULL,
            comment TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )
    `);
    console.log('Created reviews');

    // 4. Insert homepage sections
    console.log('Inserting homepage sections...');
    await connection.query("INSERT INTO homepage_sections (id, name, position) VALUES (1, 'New Arrivals', 1), (2, 'Best Sellers', 2), (3, 'Flash Sale', 3)");
    console.log('Sections inserted.');

    // 5. Insert default settings
    console.log('Inserting default settings...');
    const defaultSettings = [
        ['heroTitle', 'Sleep Beautifully,'],
        ['heroTitleHighlight', 'Every Night.'],
        ['heroSubtitle', 'Discover Aruna Nighties — soft Indian cotton nightgowns crafted for comfort, modesty, and elegance. Designed for every woman.'],
        ['heroBadge', 'New Collection 2025'],
        ['heroStartingPrice', '499'],
        ['featuredSectionLabel', 'Handpicked for You'],
        ['featuredSectionTitle', 'Top Featured Nighties'],
        ['featuredSectionSubtitle', 'Traditional Indian cotton nightgowns — soft, stylish, and made to last.']
    ];
    for (const [key, value] of defaultSettings) {
        await connection.query('INSERT INTO site_settings (\`key\`, value) VALUES (?, ?)', [key, value]);
    }
    console.log('Settings inserted.');

    // 6. Restore products
    console.log('Restoring products...');
    const fs = await import('fs');
    const productsData = JSON.parse(fs.readFileSync('products_backup.json', 'utf8'));
    for (const p of productsData) {
        await connection.query(
            `INSERT INTO products (id, name, description, image_url, stock, category_id, section_id, rating, review_count, review_text, images, sizes, inventory, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [p.id, p.name, p.description, p.image_url, p.stock, p.category_id, p.section_id, p.rating, p.review_count, p.review_text, 
             typeof p.images === 'string' ? p.images : JSON.stringify(p.images), 
             typeof p.sizes === 'string' ? p.sizes : JSON.stringify(p.sizes), 
             typeof p.inventory === 'string' ? p.inventory : JSON.stringify(p.inventory), 
             p.created_at, p.updated_at]
        );
    }
    console.log(`Restored ${productsData.length} products.`);

    console.log('\nAll tables recreated and data restored successfully!');

    await connection.end();
  } catch (error) {
    console.error('Fatal Error during manual sync:', error);
  }
}

manualSync();
