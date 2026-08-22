import { NextRequest, NextResponse } from "next/server";
import { getNDRList, createNDR } from "@/services/shipping";
import { logger } from "@/lib/serverLogger";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { db, ordersTable } from "@/db";
import { syncNdrCases, createPendingNdrAction, finalizeNdrAction } from "@/lib/db-ndr";

function normalizeAwb(val: unknown): string {
  return String(val ?? "").trim().toLowerCase();
}

export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    logger.info("Fetching NDR exceptions list");
    const rawNdrResponse = await getNDRList();
    const rawList = rawNdrResponse?.data || (Array.isArray(rawNdrResponse) ? rawNdrResponse : []);

    // Sync NDRs with database
    const caseMap = await syncNdrCases(rawList);

    // Enrich NDR items with DB metadata
    const enrichedList = rawList.map((item: any) => {
      const awbKey = item.awb_number || item.awb || "";
      const meta = caseMap[awbKey];
      return {
        ...item,
        db_case_id: meta?.id ?? null,
        db_status: meta?.status ?? "open",
        history_count: meta?.historyCount ?? 0,
      };
    });

    if (rawNdrResponse && typeof rawNdrResponse === "object" && !Array.isArray(rawNdrResponse) && rawNdrResponse.data) {
      return NextResponse.json({
        ...rawNdrResponse,
        data: enrichedList,
      });
    }

    return NextResponse.json(enrichedList);
  } catch (error: any) {
    logger.error({ error: error.message }, "Error during fetching NDR list");
    return NextResponse.json({ error: "Internal server error during fetching NDR list", message: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { awb, action, action_data, remarks, re_attempt_date } = body ?? {};

    if (!awb || !action) {
      return NextResponse.json({ error: "Missing awb or action parameter" }, { status: 400 });
    }

    const normAwb = normalizeAwb(awb);

    // Backend Security Verification: Ensure AWB belongs to an order in our store database
    const allOrders = await db.select({ id: ordersTable.id, awbNumber: ordersTable.awbNumber }).from(ordersTable);
    const matchedOrder = allOrders.find((o) => normalizeAwb(o.awbNumber) === normAwb);
    const orderId = matchedOrder ? matchedOrder.id : null;

    // Build standard Xpressbees payload structure
    const requestPayload = [
      {
        awb: String(awb).trim(),
        action: action,
        action_data: action_data || {},
        re_attempt_date: re_attempt_date || undefined,
        remarks: remarks || "Admin NDR action instruction",
      },
    ];

    // Log pending audit action in database BEFORE calling external API
    const pendingAction = await createPendingNdrAction({
      awbNumber: String(awb).trim(),
      orderId: orderId,
      adminUserId: null, // Authenticated token session
      action,
      actionData: action_data || {},
      reAttemptDate: re_attempt_date || null,
      remarks: remarks || null,
      requestPayload,
    });

    logger.info({ awb, action, actionId: pendingAction.id }, "Submitting NDR action to Xpressbees");

    try {
      const result = await createNDR({ awb, action, action_data: action_data || {} });

      // Determine provider result status
      let isSuccess = false;
      let responseMsg = "NDR action submitted";

      if (Array.isArray(result)) {
        const itemResult = result.find((r: any) => normalizeAwb(r.awb) === normAwb) || result[0];
        isSuccess = itemResult?.status === true || itemResult?.response === true || itemResult?.success === true;
        responseMsg = itemResult?.message || responseMsg;
      } else if (result && typeof result === "object") {
        isSuccess = result.status === true || result.response === true || result.success === true;
        responseMsg = result.message || responseMsg;
      }

      // Finalize audit record with provider response
      await finalizeNdrAction({
        actionId: pendingAction.id,
        status: isSuccess ? "success" : "failed",
        responsePayload: result,
        errorMessage: isSuccess ? null : responseMsg,
      });

      return NextResponse.json({
        success: isSuccess,
        message: responseMsg,
        data: result,
      });
    } catch (err: any) {
      // Finalize audit record with network/system failure. NEVER delete the record.
      await finalizeNdrAction({
        actionId: pendingAction.id,
        status: "failed",
        responsePayload: null,
        errorMessage: err.message || "Network error while connecting to provider",
      });

      logger.error({ error: err.message, awb, actionId: pendingAction.id }, "NDR action API call failed");
      return NextResponse.json({
        success: false,
        error: "NDR Action Failed",
        message: err.message || "Network / provider error",
      }, { status: 500 });
    }
  } catch (error: any) {
    logger.error({ error: error.message }, "Error during NDR action creation");
    return NextResponse.json({ error: "Internal server error during NDR action creation", message: error.message }, { status: 500 });
  }
}
