import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const ndrCasesTable = sqliteTable("ndr_cases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id"),
  awbNumber: text("awb_number").notNull(),
  eventDate: text("event_date"),
  courierRemarks: text("courier_remarks"),
  totalAttempts: integer("total_attempts").default(1),
  status: text("status").notNull().default("open"), // open | responded | resolved
  firstSeenAt: integer("first_seen_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  resolvedAt: integer("resolved_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
});

export const ndrResponseActionsTable = sqliteTable("ndr_response_actions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ndrCaseId: integer("ndr_case_id"),
  orderId: integer("order_id"),
  awbNumber: text("awb_number").notNull(),
  adminUserId: integer("admin_user_id"),
  action: text("action").notNull(), // re-attempt | update-address | update-phone
  actionData: text("action_data", { mode: "json" }),
  reAttemptDate: text("re_attempt_date"),
  remarks: text("remarks"),
  requestPayload: text("request_payload", { mode: "json" }),
  responsePayload: text("response_payload", { mode: "json" }),
  status: text("status").notNull().default("pending"), // pending | success | failed
  errorMessage: text("error_message"),
  submittedAt: integer("submitted_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type NdrCase = typeof ndrCasesTable.$inferSelect;
export type NdrResponseAction = typeof ndrResponseActionsTable.$inferSelect;
