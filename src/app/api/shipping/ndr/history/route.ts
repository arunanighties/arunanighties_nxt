import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { getNdrHistory } from "@/lib/db-ndr";
import { logger } from "@/lib/serverLogger";

export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const awb = searchParams.get("awb");

  if (!awb) {
    return NextResponse.json({ error: "awb parameter is required" }, { status: 400 });
  }

  try {
    const history = await getNdrHistory(awb.trim());
    return NextResponse.json(history);
  } catch (error: any) {
    logger.error({ error: error.message, awb }, "Failed to fetch NDR audit history");
    return NextResponse.json(
      { error: "Failed to fetch NDR audit history", message: error.message },
      { status: 500 }
    );
  }
}
