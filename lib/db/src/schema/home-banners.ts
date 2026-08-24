import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const homeBannersTable = sqliteTable(
  "home_banners",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title"),
    subtitle: text("subtitle"),
    desktopImageUrl: text("desktop_image_url").notNull(),
    mobileImageUrl: text("mobile_image_url").notNull(),
    ctaText: text("cta_text"),
    ctaUrl: text("cta_url"),
    linkType: text("link_type").notNull().default("internal"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    startsAt: integer("starts_at", { mode: "timestamp" }),
    endsAt: integer("ends_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdateFn(() => new Date()),
  },
  (table) => [
    index("idx_home_banners_active_sort").on(table.isActive, table.sortOrder),
    index("idx_home_banners_schedule").on(table.startsAt, table.endsAt),
  ]
);

export const insertHomeBannerSchema = createInsertSchema(homeBannersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertHomeBanner = z.infer<typeof insertHomeBannerSchema>;
export type HomeBanner = typeof homeBannersTable.$inferSelect;
