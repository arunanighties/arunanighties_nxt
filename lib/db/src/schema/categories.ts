import { mysqlTable, text, int, timestamp, varchar } from "drizzle-orm/mysql-core";

export const categoriesTable = mysqlTable("categories", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description").notNull(),
  icon: varchar("icon", { length: 255 }).notNull().default("🌸"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Category = typeof categoriesTable.$inferSelect;
