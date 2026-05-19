import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db, ordersTable, productsTable } from "@/db";
import { eq } from "drizzle-orm";

async function tryDecrementStock(tx: any, prodId: number, qtyOrdered: number, size?: string, color?: string): Promise<number> {
  const [product] = await tx
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, prodId))
    .limit(1);

  if (!product) return 0;

  let currentStock = product.stock ?? 0;
  let currentSizes = product.sizes;
  let currentInventory = product.inventory;

  if (typeof currentSizes === "string") {
    try { currentSizes = JSON.parse(currentSizes); } catch { currentSizes = []; }
  }
  if (!Array.isArray(currentSizes)) currentSizes = [];

  if (typeof currentInventory === "string") {
    try { currentInventory = JSON.parse(currentInventory); } catch { currentInventory = {}; }
  }
  if (!currentInventory || typeof currentInventory !== "object") currentInventory = {};

  let limit = currentStock;

  let matchedSizeObj: any = null;
  if (size) {
    matchedSizeObj = currentSizes.find((s: any) => String(s.size).toUpperCase() === String(size).toUpperCase());
    if (matchedSizeObj) {
      limit = Math.min(limit, matchedSizeObj.quantity ?? 0);
    } else {
      limit = 0;
    }
  }

  let matchedSizeKey = "";
  let matchedColorKey = "";
  if (size && color) {
    const sizeKeys = Object.keys(currentInventory);
    matchedSizeKey = sizeKeys.find(k => k.toUpperCase() === String(size).toUpperCase()) || "";
    if (matchedSizeKey) {
      const colorKeys = Object.keys(currentInventory[matchedSizeKey] || {});
      matchedColorKey = colorKeys.find(c => c.toUpperCase() === String(color).toUpperCase()) || "";
      if (matchedColorKey) {
        const matchedInventoryObj = currentInventory[matchedSizeKey][matchedColorKey];
        limit = Math.min(limit, matchedInventoryObj.qty ?? 0);
      } else {
        limit = 0;
      }
    } else {
      limit = 0;
    }
  }

  const actualDecrement = Math.max(0, Math.min(limit, qtyOrdered));
  if (actualDecrement === 0) {
    return 0;
  }

  const nextStock = Math.max(0, currentStock - actualDecrement);

  const nextSizes = currentSizes.map((s: any) => {
    if (size && String(s.size).toUpperCase() === String(size).toUpperCase()) {
      return { ...s, quantity: Math.max(0, (s.quantity ?? 0) - actualDecrement) };
    }
    return s;
  });

  const nextInventory = { ...currentInventory } as any;
  if (size && color && matchedSizeKey && matchedColorKey) {
    nextInventory[matchedSizeKey][matchedColorKey].qty = Math.max(0, (nextInventory[matchedSizeKey][matchedColorKey].qty ?? 0) - actualDecrement);
  }

  await tx
    .update(productsTable)
    .set({
      stock: nextStock,
      sizes: nextSizes,
      inventory: nextInventory,
    })
    .where(eq(productsTable.id, prodId));

  return actualDecrement;
}

export async function POST(request: NextRequest) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderData,
    } = await request.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderData) {
      return NextResponse.json({ error: "Missing required verification fields or order data" }, { status: 400 });
    }

    const key_secret = process.env.RAZORPAY_KEY_SECRET || "";
    const generated_signature = crypto
      .createHmac("sha256", key_secret)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generated_signature === razorpay_signature) {
      const { customerName, phone, items, total, address, userId } = orderData;

      const itemsStr = typeof items === "string" ? items : JSON.stringify(items ?? []);
      const parsedUserId = userId ? parseInt(String(userId), 10) : null;

      const resultId = await db.transaction(async (tx) => {
        const orderItemsArray = Array.isArray(items) ? items : JSON.parse(itemsStr);
        const updatedItemsArray: any[] = [];

        for (const item of orderItemsArray) {
          const prodId = parseInt(String(item.id), 10);
          if (!prodId || isNaN(prodId)) {
            updatedItemsArray.push(item);
            continue;
          }

          const qtyOrdered = parseInt(String(item.qty || item.quantity || 1), 10);
          const decremented = await tryDecrementStock(tx, prodId, qtyOrdered, item.size, item.color);

          updatedItemsArray.push({
            ...item,
            stock_decremented: decremented
          });
        }

        const [insertResult] = await tx
          .insert(ordersTable)
          .values({
            userId: parsedUserId && !isNaN(parsedUserId) ? parsedUserId : null,
            customerName: String(customerName || "Guest"),
            email: phone ? `${phone}@aruna.app` : "guest@aruna.app",
            phone: phone ? String(phone) : null,
            items: JSON.stringify(updatedItemsArray),
            address: address ? String(address) : null,
            total: String(parseFloat(total).toFixed(2)),
            status: "pending",
            paymentStatus: "paid",
            razorpayOrderId: razorpay_order_id as string,
            razorpayPaymentId: razorpay_payment_id as string,
            razorpaySignature: razorpay_signature as string,
          });

        return insertResult.insertId;
      });

      return NextResponse.json({ 
        success: true, 
        message: "Payment verified and order created", 
        orderId: resultId 
      });
    } else {
      return NextResponse.json({ success: false, error: "Invalid signature" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Razorpay Verification & Insertion Error:", error);
    return NextResponse.json({ error: error.message || "Failed to verify payment and save order" }, { status: 500 });
  }
}
