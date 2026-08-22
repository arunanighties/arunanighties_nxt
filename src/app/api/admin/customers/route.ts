import { NextRequest, NextResponse } from "next/server";
import { db, usersTable, ordersTable } from "@/db";
import { verifyAdminToken } from "@/lib/adminAuth";
import { desc, eq, or, like } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const auth = request.headers.get("authorization");
    if (!auth || !auth.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = auth.slice(7);
    if (!verifyAdminToken(token)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get("search") || "").trim().toLowerCase();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "10", 10)));

    // Parse Admin Phone Numbers to exclude
    const adminPhonesRaw = process.env.ADMIN_PHONES || process.env.ADMIN_PHONE || "9704761386";
    const adminPhonesList = adminPhonesRaw
      .split(",")
      .map(num => num.replace(/\D/g, "").slice(-10))
      .filter(Boolean);

    // Fetch all users and orders
    const allUsers = await db.select().from(usersTable).orderBy(desc(usersTable.id));
    const allOrders = await db.select().from(ordersTable).orderBy(desc(ordersTable.id));

    // Filter out customers having Admin Phone numbers
    const validCustomers = allUsers.filter(user => {
      if (!user.phone) return true;
      const userPhoneNorm = user.phone.replace(/\D/g, "").slice(-10);
      return !adminPhonesList.includes(userPhoneNorm);
    });

    // Apply search filter (by name or phone)
    const filteredCustomers = search
      ? validCustomers.filter(c => {
          const name = (c.name || "").toLowerCase();
          const phone = (c.phone || "").toLowerCase();
          return name.includes(search) || phone.includes(search);
        })
      : validCustomers;

    const total = filteredCustomers.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;

    const paginated = filteredCustomers.slice(offset, offset + limit);

    // Enrich customers with their order history and cart items
    const customersWithDetails = paginated.map(customer => {
      const userPhoneNorm = (customer.phone || "").replace(/\D/g, "").slice(-10);
      
      const customerOrders = allOrders.filter(order => {
        if (order.userId && order.userId === customer.id) return true;
        if (order.phone) {
          const orderPhoneNorm = order.phone.replace(/\D/g, "").slice(-10);
          if (orderPhoneNorm && orderPhoneNorm === userPhoneNorm) return true;
        }
        return false;
      });

      // Extract cart/pending items if available
      let cartItems: any[] = [];
      if (customer.cart) {
        try {
          const parsed = typeof customer.cart === "string" ? JSON.parse(customer.cart) : customer.cart;
          if (Array.isArray(parsed)) cartItems = parsed;
        } catch {}
      }
      if (cartItems.length === 0) {
        const pendingOrder = customerOrders.find(o => (o.status || "").toLowerCase() === "pending");
        if (pendingOrder && pendingOrder.items) {
          try {
            cartItems = typeof pendingOrder.items === "string" ? JSON.parse(pendingOrder.items) : pendingOrder.items;
          } catch {}
        }
      }

      return {
        id: customer.id,
        name: customer.name || "Guest User",
        phone: customer.phone ? (customer.phone.startsWith("+") ? customer.phone : `+91 ${customer.phone.replace(/\D/g, "").slice(-10)}`) : "—",
        rawPhone: customer.phone,
        email: customer.email || "—",
        addresses: customer.addresses,
        role: "USER",
        createdAt: customer.createdAt,
        ordersCount: customerOrders.length,
        orders: customerOrders,
        cartItems: cartItems
      };
    });

    return NextResponse.json({
      customers: customersWithDetails,
      total,
      page,
      totalPages,
      limit
    });
  } catch (error: any) {
    console.error("Error fetching customers:", error);
    return NextResponse.json({ error: "Failed to fetch customers", message: error.message }, { status: 500 });
  }
}
