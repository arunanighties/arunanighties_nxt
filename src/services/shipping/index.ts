/**
 * Shipping Service Adapter
 * Centralized entry point for shipping integrations.
 */

import { trackShipmentMock, advanceMockStage, rewindMockStage, getMockNDRList, createMockNDR } from "./mock.service";
export { advanceMockStage, rewindMockStage };

import { trackShipmentXpressbees, generateShipmentXpressbees, requestPickupXpressbees, getXpressbeesCouriers, cancelShipmentXpressbees, getXpressbeesNDRList, createXpressbeesNDR } from "./xpressbees.service";
import { logger } from "../../lib/serverLogger";

const USE_MOCK_SHIPPING = process.env.USE_MOCK_SHIPPING === "true";

/**
 * Tracks a shipment by its AWB number.
 */
export const trackShipment = async (awbNumber: string) => {
  if (USE_MOCK_SHIPPING) {
    logger.debug({ awb: awbNumber }, "Using Mock Shipping Service");
    return await trackShipmentMock(awbNumber);
  } else {
    return await trackShipmentXpressbees(awbNumber);
  }
};

/**
 * Generates an AWB/Shipment for an order.
 */
export const generateShipment = async (order: any, items: any[], packageDetails?: any) => {
  if (USE_MOCK_SHIPPING) {
    const mockAwb = "MOCK_AWB_" + Date.now();
    logger.info({ awb: mockAwb }, "Generated Mock AWB");
    return {
      response: true,
      message: "booked",
      shipping_id: 1000 + Math.floor(Math.random() * 9000),
      awb_number: mockAwb,
      courier_id: "15",
      label: "https://pdfobject.com/pdf/sample.pdf",
      invoiceNumber: packageDetails?.invoiceNumber || `INV-${order.id}-MOCK`,
      invoiceDate: packageDetails?.invoiceDate || new Date().toISOString().split("T")[0]
    };
  } else {
    return await generateShipmentXpressbees(order, items, packageDetails);
  }
};

/**
 * Requests a pickup for one or more AWBs.
 */
export const requestPickup = async (awbNumbers: string) => {
  if (USE_MOCK_SHIPPING) {
    logger.info({ awbs: awbNumbers }, "Mocking Pickup Request");
    return {
      response: true,
      message: "Mock Pickup manifest generated",
      data: "https://pdfobject.com/pdf/sample.pdf"
    };
  } else {
    return await requestPickupXpressbees(awbNumbers);
  }
};

/**
 * Fetches available couriers.
 */
export const getCouriers = async () => {
  if (USE_MOCK_SHIPPING) {
    return [
      { id: "01", name: "B2C Air" },
      { id: "02", name: "B2C Surface" }
    ];
  } else {
    const result = (await getXpressbeesCouriers()) as any;
    return Array.isArray(result) ? result : (result.data || []);
  }
};

/**
 * Cancels a shipment by AWB number.
 */
export const cancelShipment = async (awbNumber: string) => {
  if (USE_MOCK_SHIPPING) {
    logger.info({ awb: awbNumber }, "Mocking Cancel Shipment Request");
    return {
      response: true,
      status: true,
      message: "Mock Cancellation Successful"
    };
  } else {
    return await cancelShipmentXpressbees(awbNumber);
  }
};

/**
 * Fetches the NDR (Non-Delivery Report) exceptions list.
 */
export const getNDRList = async () => {
  if (USE_MOCK_SHIPPING) {
    logger.debug("Fetching mock NDR list");
    return await getMockNDRList();
  } else {
    return await getXpressbeesNDRList();
  }
};

/**
 * Creates/submits an NDR action (re-attempt, update phone, update address).
 */
export const createNDR = async (payload: { awb: string; action: string; action_data: any }) => {
  if (USE_MOCK_SHIPPING) {
    logger.info({ payload }, "Submitting mock NDR action");
    return await createMockNDR(payload);
  } else {
    return await createXpressbeesNDR(payload);
  }
};

export default trackShipment;
