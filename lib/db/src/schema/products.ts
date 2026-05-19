import {
  mysqlTable,
  text,
  int,
  timestamp,
  decimal,
  json,
  varchar,
} from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const productsTable = mysqlTable("products", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
  stock: int("stock").notNull().default(0),
  categoryId: int("category_id"),
  sectionId: int("section_id"),
  rating: decimal("rating", { precision: 3, scale: 1 }).notNull().default("4.3"),
  reviewCount: int("review_count").notNull().default(1),
  reviewText: text("review_text").notNull(),
  images: json("images").$type<string[]>().notNull(),
  sizes: json("sizes").$type<{ size: string; quantity: number }[]>().notNull(),
  inventory: json("inventory").$type<Record<string, Record<string, { hex: string; qty: number; price: number; mrp: number }>>>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .onUpdateNow(),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
