
import { db } from './lib/db/src/index.ts';
import { sql } from 'drizzle-orm';

async function doctor() {
    console.log('--- SYSTEM CHECK ---');
    console.log('Node Version:', process.version);
    console.log('Platform:', process.platform);
    console.log('Env DATABASE_URL:', process.env.DATABASE_URL ? 'SET (length: ' + process.env.DATABASE_URL.length + ')' : 'NOT SET');
    
    if (process.env.DATABASE_URL) {
        const masked = process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@');
        console.log('Masked URL:', masked);
    }

    try {
        console.log('\n--- DATABASE CHECK ---');
        const [rows] = await db.execute(sql`SELECT DATABASE() as db, USER() as user, VERSION() as version`);
        console.log('Connected to:', rows);

        const [tables] = await db.execute(sql`SHOW TABLES`);
        console.log('Tables found:', tables);

        const tableNames = tables.map(t => Object.values(t)[0]);
        const tablesToCheck = ['products', 'site_settings', 'homepage_sections', 'users', 'reviews', 'orders', 'categories'];
        
        for (const name of tablesToCheck) {
            if (tableNames.includes(name)) {
                console.log(`\nChecking table structure for: ${name}`);
                try {
                    const [cols] = await db.execute(sql`DESCRIBE ${sql.raw(name)}`);
                    console.table(cols);
                } catch (err) {
                    console.error(`Error describing table ${name}:`, err.message);
                }
            } else {
                console.error(`MISSING TABLE: ${name}`);
            }
        }

    } catch (e) {
        console.error('DATABASE ERROR:', e);
    }
}

doctor();
