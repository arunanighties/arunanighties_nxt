import {
  sqliteTable,
  text,
  integer,
  real,
} from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const productsTable = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
  stock: integer("stock").notNull().default(0),
  categoryId: integer("category_id"),
  sectionId: integer("section_id"),
  rating: real("rating").notNull().default(4.3),
  reviewCount: integer("review_count").notNull().default(1),
  reviewText: text("review_text").notNull(),
  images: text("images", { mode: "json" }).$type<string[]>().notNull(),
  sizes: text("sizes", { mode: "json" }).$type<{ size: string; quantity: number }[]>().notNull(),
  inventory: text("inventory", { mode: "json" }).$type<Record<string, Record<string, { hex: string; qty: number; price: number; mrp: number }>>>().default({}),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
