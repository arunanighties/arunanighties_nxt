import { NextRequest, NextResponse } from "next/server";
import { adminAuth as firebaseAdminAuth } from "@/lib/firebaseAdmin";
import { generateAdminToken, generateUserToken } from "@/lib/adminAuth";
import { db, usersTable } from "@/db";
import { eq } from "drizzle-orm";

const ADMIN_PHONES = (process.env.ADMIN_PHONES || process.env.ADMIN_PHONE || "9704761386")
  .split(",")
  .map(num => num.replace(/\D/g, "").slice(-10));

export async function POST(request: NextRequest) {
  try {
    const { firebaseIdToken } = await request.json();
    
    if (!firebaseIdToken) {
      return NextResponse.json({ error: "firebaseIdToken is required." }, { status: 400 });
    }

    const decodedToken = await firebaseAdminAuth.verifyIdToken(firebaseIdToken);
    const phoneWithCountry = decodedToken.phone_number;
    
    if (!phoneWithCountry) {
      return NextResponse.json({ error: "Phone number not found in Firebase token." }, { status: 400 });
    }

    const phone = phoneWithCountry.replace(/\D/g, "").slice(-10);

    if (ADMIN_PHONES.includes(phone)) {
      const token = generateAdminToken();
      return NextResponse.json({ success: true, token, isAdmin: true });
    }

    const existingUsers = await db.select().from(usersTable).where(eq(usersTable.phone, phone)).limit(1);
    let user = existingUsers[0];

    if (!user) {
      const [result] = await db.insert(usersTable).values({ 
        phone, 
        email: null,
        name: null
      });
      const [newUser] = await db.select().from(usersTable).where(eq(usersTable.id, result.insertId));
      user = newUser;
    }

    const token = generateUserToken(user.id);
    return NextResponse.json({ 
      success: true, 
      token, 
      user, 
      isAdmin: false,
      isNew: !existingUsers[0]
    });
  } catch (error: any) {
    console.error("Firebase Auth Error:", error.message);
    return NextResponse.json({ error: "Failed to verify Firebase token." }, { status: 401 });
  }
}
