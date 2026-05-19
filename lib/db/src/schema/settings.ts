import { mysqlTable, text, int, timestamp, varchar } from "drizzle-orm/mysql-core";

export const siteSettingsTable = mysqlTable("site_settings", {
  id: int("id").primaryKey().autoincrement(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export type SiteSetting = typeof siteSettingsTable.$inferSelect;
