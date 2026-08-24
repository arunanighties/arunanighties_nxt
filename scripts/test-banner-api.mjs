import dotenv from "dotenv";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { and, eq, isNull, lte, gte, or, asc } from "drizzle-orm";

dotenv.config();

const homeBannersTable = sqliteTable(
  "home_banners",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title"),
    subtitle: text("subtitle"),
    desktopImageUrl: text("desktop_image_url").notNull(),
    mobileImageUrl: text("mobile_image_url").notNull(),
    ctaText: text("cta_text"),
    ctaUrl: text("cta_url"),
    linkType: text("link_type").notNull().default("internal"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    startsAt: integer("starts_at", { mode: "timestamp" }),
    endsAt: integer("ends_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  }
);

let databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || databaseUrl.startsWith("mysql:") || databaseUrl.startsWith("postgresql:") || databaseUrl.startsWith("postgres:")) {
  databaseUrl = process.env.TURSO_DATABASE_URL;
}

if (!databaseUrl) {
  throw new Error("Neither DATABASE_URL nor TURSO_DATABASE_URL is set");
}

const client = createClient({
  url: databaseUrl,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const db = drizzle(client);

async function runTests() {
  console.log("🚀 Starting Home Banner Integration Tests...");

  // 1. Ensure Table
  console.log("\n--- Test 1: Ensure Table Exists ---");
  await client.execute(`
    CREATE TABLE IF NOT EXISTS home_banners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      subtitle TEXT,
      desktop_image_url TEXT NOT NULL,
      mobile_image_url TEXT NOT NULL,
      cta_text TEXT,
      ctaUrl TEXT,
      link_type TEXT NOT NULL DEFAULT 'internal',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      starts_at INTEGER,
      ends_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  console.log("✅ home_banners table verified in Turso/LibSQL database.");

  // 2. Insert test items
  console.log("\n--- Test 2: Insert Banner Variants ---");
  const now = new Date();
  const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [b1] = await db
    .insert(homeBannersTable)
    .values({
      title: "Test Active Banner",
      desktopImageUrl: "https://example.com/d1.jpg",
      mobileImageUrl: "https://example.com/m1.jpg",
      sortOrder: 1,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  const [bInactive] = await db
    .insert(homeBannersTable)
    .values({
      title: "Test Inactive Banner",
      desktopImageUrl: "https://example.com/d_in.jpg",
      mobileImageUrl: "https://example.com/m_in.jpg",
      sortOrder: 2,
      isActive: false,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  const [bFuture] = await db
    .insert(homeBannersTable)
    .values({
      title: "Test Future Banner",
      desktopImageUrl: "https://example.com/d_fut.jpg",
      mobileImageUrl: "https://example.com/m_fut.jpg",
      startsAt: future,
      sortOrder: 3,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  const [bExpired] = await db
    .insert(homeBannersTable)
    .values({
      title: "Test Expired Banner",
      desktopImageUrl: "https://example.com/d_exp.jpg",
      mobileImageUrl: "https://example.com/m_exp.jpg",
      endsAt: past,
      sortOrder: 4,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  console.log("Inserted banner IDs:", { b1: b1.id, bInactive: bInactive.id, bFuture: bFuture.id, bExpired: bExpired.id });

  // 3. Test Storefront Query
  console.log("\n--- Test 3: Execute Storefront Publication Query ---");
  const publicBanners = await db
    .select()
    .from(homeBannersTable)
    .where(
      and(
        eq(homeBannersTable.isActive, true),
        or(isNull(homeBannersTable.startsAt), lte(homeBannersTable.startsAt, now)),
        or(isNull(homeBannersTable.endsAt), gte(homeBannersTable.endsAt, now))
      )
    )
    .orderBy(asc(homeBannersTable.sortOrder), asc(homeBannersTable.id));

  const returnedIds = publicBanners.map((b) => b.id);
  console.log("Returned Public Banner IDs:", returnedIds);

  const testPassed =
    returnedIds.includes(b1.id) &&
    !returnedIds.includes(bInactive.id) &&
    !returnedIds.includes(bFuture.id) &&
    !returnedIds.includes(bExpired.id);

  if (testPassed) {
    console.log("✅ Storefront publication filtering is 100% correct!");
  } else {
    console.error("❌ Publication query test FAILED!");
  }

  // Cleanup
  await db.delete(homeBannersTable).where(eq(homeBannersTable.id, b1.id));
  await db.delete(homeBannersTable).where(eq(homeBannersTable.id, bInactive.id));
  await db.delete(homeBannersTable).where(eq(homeBannersTable.id, bFuture.id));
  await db.delete(homeBannersTable).where(eq(homeBannersTable.id, bExpired.id));
  console.log("✅ Cleaned up test banners.");

  if (!testPassed) process.exit(1);
}

runTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
