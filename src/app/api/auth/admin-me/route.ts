import { NextRequest, NextResponse } from "next/server";
import { AdminMeResponse } from "@workspace/api-zod";
import { verifyAdminToken } from "@/lib/adminAuth";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const token = auth.slice(7);
  if (!verifyAdminToken(token)) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  return NextResponse.json(AdminMeResponse.parse({ authenticated: true }));
}
