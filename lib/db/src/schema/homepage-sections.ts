import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const homepageSectionsTable = sqliteTable("homepage_sections", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  position: integer("position").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type HomepageSection = typeof homepageSectionsTable.$inferSelect;
