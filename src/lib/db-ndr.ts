import { db, ordersTable, ndrCasesTable, ndrResponseActionsTable } from "@/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { logger } from "@/lib/serverLogger";

let tablesChecked = false;

export async function ensureNdrTablesExist() {
  if (tablesChecked) return;
  try {
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS ndr_cases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        awb_number TEXT NOT NULL,
        event_date TEXT,
        courier_remarks TEXT,
        total_attempts INTEGER DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'open',
        first_seen_at INTEGER NOT NULL,
        last_seen_at INTEGER NOT NULL,
        resolved_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    await db.run(sql`
      CREATE TABLE IF NOT EXISTS ndr_response_actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ndr_case_id INTEGER,
        order_id INTEGER,
        awb_number TEXT NOT NULL,
        admin_user_id INTEGER,
        action TEXT NOT NULL,
        action_data TEXT,
        re_attempt_date TEXT,
        remarks TEXT,
        request_payload TEXT,
        response_payload TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        error_message TEXT,
        submitted_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );
    `);

    tablesChecked = true;
  } catch (err) {
    logger.error({ error: (err as any).message }, "Error ensuring NDR tables exist");
  }
}

function normalizeAwb(val: unknown): string {
  return String(val ?? "").trim().toLowerCase();
}

/**
 * Synchronizes Xpressbees NDRs with our local ndr_cases table.
 * Deduplicates by awb_number + event_date + total_attempts + courier_remarks.
 * Returns a map of AWB -> { caseId, status, historyCount }.
 */
export async function syncNdrCases(ndrList: any[]) {
  await ensureNdrTablesExist();

  const caseMap: Record<string, { id: number; status: string; historyCount: number }> = {};
  if (!Array.isArray(ndrList) || ndrList.length === 0) return caseMap;

  // 1. Fetch all store orders to match AWBs
  const allOrders = await db.select({ id: ordersTable.id, awbNumber: ordersTable.awbNumber }).from(ordersTable);
  const orderAwbMap = new Map<string, number>();
  for (const o of allOrders) {
    const norm = normalizeAwb(o.awbNumber);
    if (norm) orderAwbMap.set(norm, o.id);
  }

  // 2. Process each NDR item
  const now = new Date();
  for (const item of ndrList) {
    const rawAwb = item.awb_number || item.awb || "";
    const normAwb = normalizeAwb(rawAwb);
    if (!normAwb) continue;

    const matchedOrderId = orderAwbMap.get(normAwb) ?? null;
    const eventDate = String(item.event_date || "");
    const courierRemarks = String(item.courier_remarks || "");
    const totalAttempts = parseInt(String(item.total_attempts || 1), 10) || 1;

    try {
      // Find existing case
      const existingCases = await db
        .select()
        .from(ndrCasesTable)
        .where(eq(ndrCasesTable.awbNumber, rawAwb))
        .limit(10);

      let existing = existingCases.find(
        (c) =>
          c.eventDate === eventDate &&
          c.courierRemarks === courierRemarks &&
          c.totalAttempts === totalAttempts
      );

      if (!existing && existingCases.length > 0) {
        // Fallback: match by AWB and eventDate
        existing = existingCases.find((c) => c.eventDate === eventDate);
      }

      let caseId: number;
      let currentStatus: string;

      if (existing) {
        caseId = existing.id;
        currentStatus = existing.status;
        // Update last_seen_at
        await db
          .update(ndrCasesTable)
          .set({ lastSeenAt: now, updatedAt: now })
          .where(eq(ndrCasesTable.id, existing.id));
      } else {
        // Insert new case
        const [inserted] = await db
          .insert(ndrCasesTable)
          .values({
            orderId: matchedOrderId,
            awbNumber: rawAwb,
            eventDate,
            courierRemarks,
            totalAttempts,
            status: "open",
            firstSeenAt: now,
            lastSeenAt: now,
            createdAt: now,
            updatedAt: now,
          })
          .returning();
        caseId = inserted.id;
        currentStatus = "open";
      }

      // Count existing response actions for this case or AWB
      const historyActions = await db
        .select({ id: ndrResponseActionsTable.id })
        .from(ndrResponseActionsTable)
        .where(eq(ndrResponseActionsTable.awbNumber, rawAwb));

      caseMap[rawAwb] = {
        id: caseId,
        status: currentStatus,
        historyCount: historyActions.length,
      };
    } catch (err) {
      logger.error({ error: (err as any).message, awb: rawAwb }, "Failed to sync NDR case for AWB");
    }
  }

  return caseMap;
}

/**
 * Creates a pending NDR response action entry before calling Xpressbees.
 */
export async function createPendingNdrAction(params: {
  awbNumber: string;
  orderId?: number | null;
  ndrCaseId?: number | null;
  adminUserId?: number | null;
  action: string;
  actionData: any;
  reAttemptDate?: string | null;
  remarks?: string | null;
  requestPayload: any;
}) {
  await ensureNdrTablesExist();
  const now = new Date();

  const [inserted] = await db
    .insert(ndrResponseActionsTable)
    .values({
      ndrCaseId: params.ndrCaseId ?? null,
      orderId: params.orderId ?? null,
      awbNumber: params.awbNumber,
      adminUserId: params.adminUserId ?? null,
      action: params.action,
      actionData: params.actionData ? JSON.stringify(params.actionData) : null,
      reAttemptDate: params.reAttemptDate ?? null,
      remarks: params.remarks ?? null,
      requestPayload: JSON.stringify(params.requestPayload),
      status: "pending",
      submittedAt: now,
      createdAt: now,
    })
    .returning();

  return inserted;
}

/**
 * Updates an NDR response action after Xpressbees responds or fails.
 */
export async function finalizeNdrAction(params: {
  actionId: number;
  ndrCaseId?: number | null;
  status: "success" | "failed";
  responsePayload: any;
  errorMessage?: string | null;
}) {
  await ensureNdrTablesExist();
  const now = new Date();

  await db
    .update(ndrResponseActionsTable)
    .set({
      status: params.status,
      responsePayload: JSON.stringify(params.responsePayload),
      errorMessage: params.errorMessage ?? null,
    })
    .where(eq(ndrResponseActionsTable.id, params.actionId));

  // If action succeeded, mark NDR case status as 'responded'
  if (params.status === "success" && params.ndrCaseId) {
    await db
      .update(ndrCasesTable)
      .set({
        status: "responded",
        updatedAt: now,
      })
      .where(eq(ndrCasesTable.id, params.ndrCaseId));
  }
}

/**
 * Fetches NDR history for a specific AWB or order.
 */
export async function getNdrHistory(awbNumber: string) {
  await ensureNdrTablesExist();

  const cases = await db
    .select()
    .from(ndrCasesTable)
    .where(eq(ndrCasesTable.awbNumber, awbNumber))
    .orderBy(desc(ndrCasesTable.firstSeenAt));

  const actions = await db
    .select()
    .from(ndrResponseActionsTable)
    .where(eq(ndrResponseActionsTable.awbNumber, awbNumber))
    .orderBy(desc(ndrResponseActionsTable.submittedAt));

  return {
    cases,
    actions,
  };
}
