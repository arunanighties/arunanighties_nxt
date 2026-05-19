import { NextRequest, NextResponse } from "next/server";
import { db, ordersTable } from "@/db";
import { eq } from "drizzle-orm";
import { restoreOrderStock, VALID_STATUSES } from "@/lib/orderHelpers";
import { generateShipment } from "@/services/shipping";
import { logger } from "@/lib/serverLogger";
import { isAdminAuthorized } from "@/lib/adminAuth";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
    }

    const body = await request.json();
    const { status, packageDetails, cancelReason } = body ?? {};
    logger.info({ orderId: id, status, hasPackageDetails: !!packageDetails }, "Status update requested");

    if (!status || !VALID_STATUSES.includes(status as any)) {
      return NextResponse.json({ error: `Status must be one of: ${VALID_STATUSES.join(", ")}` }, { status: 400 });
    }

    const [existing] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const isTargetCancelled = ["cancelled", "cancelled by admin"].includes(status.toLowerCase());
    const isAlreadyCancelled = ["cancelled", "cancelled by admin"].includes(existing.status.toLowerCase());

    if (isTargetCancelled && !isAlreadyCancelled) {
      await restoreOrderStock(existing.items);
    }

    let awbNumber = existing.awbNumber;
    let finalShippingDetails = (existing as any).shippingDetails;

    if (status.toLowerCase() === "cancelled by admin" && cancelReason) {
      let currentDetails = {};
      try {
        if (typeof finalShippingDetails === "string") {
          currentDetails = JSON.parse(finalShippingDetails);
        } else if (finalShippingDetails && typeof finalShippingDetails === "object") {
          currentDetails = finalShippingDetails;
        }
      } catch (e) {
        logger.error({ orderId: id, error: e }, "Failed to parse shippingDetails for cancel reason");
      }
      finalShippingDetails = {
        ...currentDetails,
        cancelReason: cancelReason
      };
    }

    if (status.toLowerCase() === "shipped") {
      if (packageDetails) {
        finalShippingDetails = packageDetails;
      }

      if (!existing.awbNumber) {
        try {
          logger.info({ orderId: id }, "Generating AWB...");
          const items = typeof existing.items === "string" ? JSON.parse(existing.items) : (existing.items ?? []);
          const shipmentResult = await generateShipment(existing, items, packageDetails);
          
          if (shipmentResult && typeof shipmentResult === "object" && shipmentResult.awb_number) {
            awbNumber = shipmentResult.awb_number;
            
            let currentDetails = {};
            try {
              if (typeof finalShippingDetails === "string") {
                currentDetails = JSON.parse(finalShippingDetails);
              } else if (finalShippingDetails && typeof finalShippingDetails === "object") {
                currentDetails = finalShippingDetails;
              }
            } catch (e) {
              logger.error({ orderId: id, error: e }, "Failed to parse existing shippingDetails");
            }

            finalShippingDetails = {
              ...currentDetails,
              shipping_id: shipmentResult.shipping_id,
              courier_id: shipmentResult.courier_id,
              label: shipmentResult.label
            };
          } else {
            awbNumber = typeof shipmentResult === "string" ? shipmentResult : shipmentResult?.awb_number || awbNumber;
          }
          
          logger.info({ orderId: id, awb: awbNumber }, "AWB generated successfully");
        } catch (awbError: any) {
          logger.error({ orderId: id, error: awbError.message }, "AWB generation failed");
          return NextResponse.json({ error: "Failed to generate AWB", message: awbError.message }, { status: 500 });
        }
      }
    }

    logger.info({ orderId: id, status, awb: awbNumber }, "Saving status update to DB");

    await db
      .update(ordersTable)
      .set({
        status: status as string,
        awbNumber: awbNumber,
        shippingDetails: finalShippingDetails
      })
      .where(eq(ordersTable.id, id));

    const [updated] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
    return NextResponse.json(updated);
  } catch (error: any) {
    logger.error({ orderId: (await params).id, error: error.message }, "Failed to update order status");
    return NextResponse.json({ error: "Failed to update order status", message: error.message }, { status: 500 });
  }
}
export const PUT = PATCH;
