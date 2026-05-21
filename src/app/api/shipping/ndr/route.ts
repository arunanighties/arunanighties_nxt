import { NextRequest, NextResponse } from "next/server";
import { getNDRList, createNDR } from "@/services/shipping";
import { logger } from "@/lib/serverLogger";
import { isAdminAuthorized } from "@/lib/adminAuth";

export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    logger.info("Fetching NDR exceptions list");
    const ndrList = await getNDRList();
    return NextResponse.json(ndrList);
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
    const { awb, action, action_data } = body ?? {};

    if (!awb || !action || !action_data) {
      return NextResponse.json({ error: "Missing awb, action, or action_data" }, { status: 400 });
    }

    logger.info({ awb, action }, "Submitting NDR action");
    const result = await createNDR({ awb, action, action_data });
    return NextResponse.json(result);
  } catch (error: any) {
    logger.error({ error: error.message }, "Error during NDR action creation");
    return NextResponse.json({ error: "Internal server error during NDR action creation", message: error.message }, { status: 500 });
  }
}
