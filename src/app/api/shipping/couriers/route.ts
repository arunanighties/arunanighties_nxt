import { NextResponse } from "next/server";
import { getCouriers } from "@/services/shipping";

export async function GET() {
  try {
    const couriers = await getCouriers();
    return NextResponse.json(Array.isArray(couriers) ? couriers : []);
  } catch (error: any) {
    console.error("Error in GET /api/shipping/couriers:", error);
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}
