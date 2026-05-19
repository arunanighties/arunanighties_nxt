import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { ReportsService } from "@/services/reports.service";
import { logger } from "@/lib/serverLogger";

export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await ReportsService.getMonthlyAnalytics();
    return NextResponse.json(data);
  } catch (error: any) {
    logger.error({ error: error.message }, "Failed to fetch monthly reports");
    return NextResponse.json({ 
      error: "Failed to fetch monthly reports", 
      message: error.message 
    }, { status: 500 });
  }
}
