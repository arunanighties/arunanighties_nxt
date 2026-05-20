import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const siteSettingsTable = sqliteTable("site_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
});

export type SiteSetting = typeof siteSettingsTable.$inferSelect;
