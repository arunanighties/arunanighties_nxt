import { NextRequest, NextResponse } from "next/server";
import { db, usersTable } from "@/db";
import { eq } from "drizzle-orm";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json(user);
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch user", message: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const updates: Record<string, string | null> = {};
    if (typeof body?.name === "string") updates.name = body.name.trim() || null;
    if (typeof body?.email === "string") updates.email = body.email.trim() || null;
    if (typeof body?.phone === "string" && body.phone.trim().length >= 7) {
      updates.phone = body.phone.trim();
    }
    if (typeof body?.addresses === "string") {
      updates.addresses = body.addresses;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    await db
      .update(usersTable)
      .set(updates)
      .where(eq(usersTable.id, id));

    const [updated] = await db.select().from(usersTable).where(eq(usersTable.id, id));
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update user", message: error.message }, { status: 500 });
  }
}
export const PUT = PATCH;
