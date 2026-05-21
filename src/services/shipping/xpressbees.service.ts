/**
 * Xpressbees Shipping Service
 * Real implementation for Xpressbees API.
 */

const XPRESSBEES_USERID = process.env.XPRESSBEES_USERID;
const XPRESSBEES_PASSWORD = process.env.XPRESSBEES_PASSWORD;
const XPRESSBEES_BASE_URL = process.env.XPRESSBEES_BASE_URL || "https://ship.xpressbees.com/api";

const CONSIGNER_DETAILS = {
  name: "Aruna textiles and Nighties 9347890690",
  phone: "9347890690",
  pincode: "508213",
  city: "SURYAPET",
  state: "TELANGANA",
  address: "jammigadda Suryapet TELANGANA",
}

// Token cache — avoids calling login API on every request
let cachedToken: string | null = null;
let tokenExpiresAt = 0;
const TOKEN_TTL_MS = 55 * 60 * 1000; // 55 minutes (Xpressbees tokens typically last 1 hour)

/**
 * Get Xpressbees Token (User login).
 *
 * Endpoint: https://ship.xpressbees.com/api/users/franchise_user_login
 *
 * Method: POST
 *
 * @returns Token string
 */
export const getXpressbeesToken = async (): Promise<string> => {
  // Return cached token if still valid
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  if (!XPRESSBEES_USERID || !XPRESSBEES_PASSWORD) {
    throw new Error("Invalid Xpressbees credentials.");
  }

  const response: any = await fetch(`${XPRESSBEES_BASE_URL}/users/franchise_user_login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username: XPRESSBEES_USERID,
      password: XPRESSBEES_PASSWORD,
    }),
  });

  const data: any = await response.json();

  if (!response.ok || data.status === "error") {
    cachedToken = null;
    tokenExpiresAt = 0;
    throw new Error(`Xpressbees Login Failed: ${data.message || response.statusText}`);
  }

  cachedToken = data.data; // The doc shows the token string is directly in the 'data' field
  tokenExpiresAt = Date.now() + TOKEN_TTL_MS;
  return cachedToken!;
};

/**
 * Track Xpressbees Shipment.
 *
 * Endpoint: https://ship.xpressbees.com/api/franchise/shipments/track_shipment
 *
 * Method: POST
 *
 * Authentication: Required
 *
 * @param awbNumber AWB number
 * @returns Tracking data
 */
export const trackShipmentXpressbees = async (awbNumber: string) => {
  const token = await getXpressbeesToken();

  const response: any = await fetch(`${XPRESSBEES_BASE_URL}/franchise/shipments/track_shipment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    // Xpressbees API documentation shows the key as "awb_number"
    body: JSON.stringify({
      awb_number: awbNumber,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Xpressbees Tracking Failed: ${response.statusText}`);
  }

  return data;
};

/**
 * Get Xpressbees Couriers.
 *
 * Endpoint: https://ship.xpressbees.com/api/franchise/shipments/courier
 *
 * Method: GET
 *
 * Authentication: Required
 * @returns Couriers list
 */
export const getXpressbeesCouriers = async () => {
  const token = await getXpressbeesToken();

  const response: any = await fetch(`${XPRESSBEES_BASE_URL}/franchise/shipments/courier`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Xpressbees Fetch Couriers Failed: ${response.statusText}`);
  }

  return data;
};

/**
 * Generate Xpressbees Shipment
 *
 * Endpoint: https://ship.xpressbees.com/api/franchise/shipments
 *
 * Method: POST
 *
 * Authentication: Required
 *
 * @param order Order object
 * @param items Items array
 * @param packageDetails Package details
 * @returns Shipment data
 */
export const generateShipmentXpressbees = async (order: any, items: any[], packageDetails?: any) => {
  const token = await getXpressbeesToken();

  // Address parsing — checkout sends: "line1, line2, city, state, pincode"
  const addressStr = order.address || "";
  const addressParts = addressStr.split(",").map((s: string) => s.trim()).filter(Boolean);

  // Extract pincode: prefer the last numeric-only segment, fall back to regex
  let pincode = "000000";
  let city = "Unknown";
  let state = "Unknown";

  if (addressParts.length >= 3) {
    // Known format from checkout: [..., city, state, pincode]
    const lastPart = addressParts[addressParts.length - 1];
    const pincodeCandidate = lastPart.replace(/\D/g, "");

    if (pincodeCandidate.length === 6) {
      pincode = pincodeCandidate;
      state = addressParts.length >= 2 ? addressParts[addressParts.length - 2].replace(/\d+/g, "").trim() || "Unknown" : "Unknown";
      city = addressParts.length >= 3 ? addressParts[addressParts.length - 3].trim() || "Unknown" : "Unknown";
    } else {
      // Fallback: scan for 6-digit pincode anywhere in the string
      const pincodeMatch = addressStr.match(/\b\d{6}\b/);
      pincode = pincodeMatch ? pincodeMatch[0] : "000000";
      state = addressParts[addressParts.length - 1].replace(/\d+/g, "").trim() || "Unknown";
      city = addressParts.length > 1 ? addressParts[addressParts.length - 2].trim() || "Unknown" : "Unknown";
    }
  } else {
    // Very short address — best-effort regex
    const pincodeMatch = addressStr.match(/\b\d{6}\b/);
    pincode = pincodeMatch ? pincodeMatch[0] : "000000";
  }

  const payload = {
    id: `${order.id}_${Date.now()}`.substring(0, 20),
    payment_method: "prepaid", // Default to prepaid as requested
    consigner_name: CONSIGNER_DETAILS.name,
    consigner_phone: CONSIGNER_DETAILS.phone,
    consigner_pincode: CONSIGNER_DETAILS.pincode,
    consigner_city: CONSIGNER_DETAILS.city,
    consigner_state: CONSIGNER_DETAILS.state,
    consigner_address: CONSIGNER_DETAILS.address,
    consignee_name: order.customerName,
    consignee_phone: order.phone || "",
    consignee_pincode: pincode,
    consignee_city: city,
    consignee_state: state,
    consignee_address: addressStr,
    products: items.map((item: any) => ({
      product_name: `${item.name || "Product"} (S: ${item.size || "N/A"}, Color: ${item.color || "N/A"})`,
      product_qty: String(item.qty || 1),
      product_price: String(item.price || 0),
      product_sku: String(item.id || item.sku || "SKU"),
    })),
    invoice: {
      invoice_number: packageDetails?.invoiceNumber || `INV-${order.id}`,
      invoice_date: packageDetails?.invoiceDate || new Date(order.createdAt).toISOString().split("T")[0],
    },
    weight: String(packageDetails?.weight || "500"),
    length: String(packageDetails?.length || "12"),
    breadth: String(packageDetails?.breadth || "12"),
    height: String(packageDetails?.height || "12"),
    courier_id: String(packageDetails?.courierId || "12992"),
    pickup_location: "customer",
    order_amount: String(order.total),
    collectable_amount: 0, // for prepaid it is 0
  };
  console.log("Payload:", payload);
  const response: any = await fetch(`${XPRESSBEES_BASE_URL}/franchise/shipments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data: any = await response.json();

  if (data.response === true) {
    return data;
  } else {
    throw new Error(`Xpressbees AWB Generation Failed: ${data.message || "Unknown error"}`);
  }
};

/**
 * Request Pickup for Xpressbees Shipments
 *
 * Endpoint: https://ship.xpressbees.com/api/franchise/shipments/pickup
 *
 * Method: POST
 *
 * Authentication: Required
 *
 * @param awbNumbers AWB numbers
 * @returns Pickup request data
 */
export const requestPickupXpressbees = async (awbNumbers: string) => {
  const token = await getXpressbeesToken();

  const response: any = await fetch(`${XPRESSBEES_BASE_URL}/franchise/shipments/pickup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      awb_numbers: awbNumbers,
    }),
  });

  const data: any = await response.json();

  // Handle various failure formats provided in requirements
  if (data.response === true || data.status === true) {
    return data;
  } else {
    throw new Error(data.message || "Pickup request failed");
  }
};


/**
 * Cancel Xpressbees Shipment
 *
 * Endpoint: https://ship.xpressbees.com/api/franchise/shipments/cancel_shipment
 *
 * Method: POST
 *
 * Authentication: Required
 *
 * @param awbNumber AWB number
 * @returns Shipment data
 */
export const cancelShipmentXpressbees = async (awbNumber: string) => {
  const token = await getXpressbeesToken();

  const response: any = await fetch(`${XPRESSBEES_BASE_URL}/franchise/shipments/cancel_shipment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      awb_number: awbNumber,
    }),
  });

  const data: any = await response.json();

  if (data.response === true || data.status === true) {
    return data;
  } else {
    throw new Error(data.message || "Shipment cancellation failed");
  }
};

/**
 * Get Xpressbees NDR Exceptions List.
 *
 * Endpoint: https://ship.xpressbees.com/api/franchise/ndr
 *
 * Method: GET
 *
 * Authentication: Required
 * @returns NDR list response
 */
export const getXpressbeesNDRList = async () => {
  const token = await getXpressbeesToken();

  const response: any = await fetch(`${XPRESSBEES_BASE_URL}/franchise/ndr`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Xpressbees Fetch NDR List Failed: ${response.statusText}`);
  }

  return data;
};

/**
 * Create Xpressbees NDR Action (Re-attempt, Update Address, Update Phone).
 *
 * Endpoint: https://ship.xpressbees.com/api/franchise/ndr/create
 *
 * Method: POST
 *
 * Authentication: Required
 * @param payload NDR action payload { awb, action, action_data }
 * @returns Response data
 */
export const createXpressbeesNDR = async (payload: { awb: string; action: string; action_data: any }) => {
  const token = await getXpressbeesToken();

  const response: any = await fetch(`${XPRESSBEES_BASE_URL}/franchise/ndr/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Xpressbees Create NDR Action Failed: ${response.statusText}`);
  }

  return data;
};

