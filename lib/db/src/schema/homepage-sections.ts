import { mysqlTable, text, int, timestamp, varchar } from "drizzle-orm/mysql-core";

export const homepageSectionsTable = mysqlTable("homepage_sections", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  position: int("position").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type HomepageSection = typeof homepageSectionsTable.$inferSelect;
