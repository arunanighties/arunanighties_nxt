import {
  mysqlTable,
  text,
  int,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }).unique(),
  addresses: text("addresses"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});


export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
