import {
  mysqlTable,
  text,
  int,
  timestamp,
  json,
  varchar,
} from "drizzle-orm/mysql-core";

export const reviewsTable = mysqlTable("reviews", {
  id: int("id").primaryKey().autoincrement(),
  productId: int("product_id").notNull(),
  userId: int("user_id"),
  userName: varchar("user_name", { length: 255 }).notNull().default("Anonymous"),
  rating: int("rating").notNull().default(5),
  title: varchar("title", { length: 255 }).notNull(),
  comment: text("comment").notNull(),
  imageUrls: json("image_urls").$type<string[]>().notNull(),
  helpfulCount: int("helpful_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Review = typeof reviewsTable.$inferSelect;
export type InsertReview = typeof reviewsTable.$inferInsert;
