import { NextResponse } from "next/server";
import { AdminLogoutResponse } from "@workspace/api-zod";

export async function POST() {
  return NextResponse.json(AdminLogoutResponse.parse({ success: true }));
}
