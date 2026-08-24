import { db } from "@/db";
import { sql } from "drizzle-orm";
import { logger } from "@/lib/serverLogger";

let tableChecked = false;

export async function ensureHomeBannersTableExist() {
  if (tableChecked) return;
  try {
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS home_banners (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        subtitle TEXT,
        desktop_image_url TEXT NOT NULL,
        mobile_image_url TEXT NOT NULL,
        cta_text TEXT,
        cta_url TEXT,
        link_type TEXT NOT NULL DEFAULT 'internal',
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        starts_at INTEGER,
        ends_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    await db.run(sql`
      CREATE INDEX IF NOT EXISTS idx_home_banners_active_sort ON home_banners (is_active, sort_order);
    `);

    await db.run(sql`
      CREATE INDEX IF NOT EXISTS idx_home_banners_schedule ON home_banners (starts_at, ends_at);
    `);

    tableChecked = true;
  } catch (err) {
    logger.error({ error: (err as any).message }, "Error ensuring home_banners table exists");
  }
}
