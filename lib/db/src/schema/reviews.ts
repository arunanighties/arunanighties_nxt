import {
  sqliteTable,
  text,
  integer,
} from "drizzle-orm/sqlite-core";

export const reviewsTable = sqliteTable("reviews", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id").notNull(),
  userId: integer("user_id"),
  userName: text("user_name").notNull().default("Anonymous"),
  rating: integer("rating").notNull().default(5),
  title: text("title").notNull(),
  comment: text("comment").notNull(),
  imageUrls: text("image_urls", { mode: "json" }).$type<string[]>().notNull(),
  helpfulCount: integer("helpful_count").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type Review = typeof reviewsTable.$inferSelect;
export type InsertReview = typeof reviewsTable.$inferInsert;
