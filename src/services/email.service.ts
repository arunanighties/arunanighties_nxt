import nodemailer from "nodemailer";
import { logger } from "@/lib/serverLogger";

export interface OrderItem {
  id?: number | string;
  name?: string;
  title?: string;
  size?: string;
  color?: string;
  quantity?: number;
  qty?: number;
  price?: number;
  image?: string;
  imageUrl?: string;
}

export interface OrderData {
  id: number | string;
  customerName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  items?: string | OrderItem[] | null;
  total?: number | string | null;
  status?: string | null;
  paymentStatus?: string | null;
  awbNumber?: string | null;
  createdAt?: string | Date | null;
  shippingDetails?: any;
}

export interface UserData {
  id: number | string;
  phone?: string | null;
  email?: string | null;
  name?: string | null;
  createdAt?: string | Date | null;
}

function getTransporter() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

function parseItems(items: string | OrderItem[] | null | undefined): OrderItem[] {
  if (!items) return [];
  if (Array.isArray(items)) return items;
  if (typeof items === "string") {
    try {
      const parsed = JSON.parse(items);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      logger.error({ error: e }, "[EmailService] Failed to parse order items JSON");
      return [];
    }
  }
  return [];
}

function formatCurrency(amount: number | string | null | undefined): string {
  const num = typeof amount === "number" ? amount : parseFloat(String(amount || 0));
  if (isNaN(num)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(num);
}

/**
 * Generates HTML template for Order Placed email notification
 */
function buildOrderPlacedHtml(order: OrderData): string {
  const items = parseItems(order.items);
  const formattedTotal = formatCurrency(order.total);
  const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  const itemsTableRows = items
    .map(
      (item) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eeeeee;">
        <strong>${item.name || item.title || "Product #" + item.id}</strong>
        ${item.size ? `<br/><span style="font-size: 12px; color: #666666;">Size: ${item.size}</span>` : ""}
        ${item.color ? `<span style="font-size: 12px; color: #666666;"> | Color: ${item.color}</span>` : ""}
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #eeeeee; text-align: center;">
        ${item.qty || item.quantity || 1}
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #eeeeee; text-align: right;">
        ${formatCurrency(item.price)}
      </td>
    </tr>
  `
    )
    .join("");

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>New Order Placed - #${order.id}</title>
  </head>
  <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; color: #333333;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
      <!-- Header -->
      <tr>
        <td style="background-color: #e11d48; padding: 20px 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">Aruna Nighties</h1>
          <p style="color: #fecdd3; margin: 5px 0 0 0; font-size: 14px;">🛍️ New Order Received!</p>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding: 30px;">
          <h2 style="font-size: 18px; margin-top: 0; color: #111827;">Order #${order.id} Details</h2>
          <p style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">Placed on ${orderDate}</p>

          <!-- Customer Info -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px; background-color: #f9fafb; border-radius: 6px; padding: 15px;">
            <tr>
              <td style="font-size: 14px; line-height: 1.6;">
                <strong>Customer Name:</strong> ${order.customerName || "N/A"}<br/>
                <strong>Phone:</strong> ${order.phone || "N/A"}<br/>
                <strong>Email:</strong> ${order.email || "N/A"}<br/>
                <strong>Payment Status:</strong> <span style="text-transform: uppercase; font-weight: bold; color: ${order.paymentStatus === "paid" ? "#16a34a" : "#d97706"};">${order.paymentStatus || "pending"}</span>
              </td>
            </tr>
          </table>

          <!-- Shipping Address -->
          ${
            order.address
              ? `
          <div style="margin-bottom: 20px; background-color: #f9fafb; border-radius: 6px; padding: 15px;">
            <strong style="font-size: 14px; color: #374151;">Delivery Address:</strong>
            <p style="margin: 5px 0 0 0; font-size: 14px; color: #4b5563; line-height: 1.5;">${order.address}</p>
          </div>
          `
              : ""
          }

          <!-- Items Table -->
          <h3 style="font-size: 16px; color: #111827; margin-bottom: 10px;">Order Items</h3>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #f3f4f6; text-align: left; font-size: 13px; color: #374151;">
                <th style="padding: 10px;">Item</th>
                <th style="padding: 10px; text-align: center;">Qty</th>
                <th style="padding: 10px; text-align: right;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsTableRows}
            </tbody>
          </table>

          <!-- Total -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="text-align: right; font-size: 16px; font-weight: bold; padding-top: 10px; border-top: 2px solid #e5e7eb; color: #111827;">
                Total Amount: <span style="color: #e11d48;">${formattedTotal}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background-color: #f9fafb; padding: 15px 30px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb;">
          This is an automated notification from Aruna Nighties Order System.
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
}

/**
 * Generates HTML template for Order Delivered email notification
 */
function buildOrderDeliveredHtml(order: OrderData): string {
  const items = parseItems(order.items);
  const formattedTotal = formatCurrency(order.total);
  const deliveryDate = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  const itemsList = items
    .map(
      (item) => `
    <li style="margin-bottom: 6px;">
      <strong>${item.name || item.title || "Product #" + item.id}</strong>
      (Qty: ${item.qty || item.quantity || 1})
      ${item.size ? ` - Size: ${item.size}` : ""}
      ${item.color ? ` - Color: ${item.color}` : ""}
    </li>
  `
    )
    .join("");

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Order Delivered - #${order.id}</title>
  </head>
  <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; color: #333333;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
      <!-- Header -->
      <tr>
        <td style="background-color: #16a34a; padding: 20px 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">Aruna Nighties</h1>
          <p style="color: #dcfce7; margin: 5px 0 0 0; font-size: 14px;">🎉 Order Delivered Successfully!</p>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding: 30px;">
          <h2 style="font-size: 18px; margin-top: 0; color: #111827;">Order #${order.id} Has Been Delivered</h2>
          <p style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">Delivered on ${deliveryDate}</p>

          <!-- Order Overview -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 15px;">
            <tr>
              <td style="font-size: 14px; line-height: 1.6; color: #166534;">
                <strong>Customer Name:</strong> ${order.customerName || "N/A"}<br/>
                <strong>Phone:</strong> ${order.phone || "N/A"}<br/>
                <strong>AWB / Tracking Number:</strong> ${order.awbNumber || "N/A"}<br/>
                <strong>Order Total:</strong> ${formattedTotal}
              </td>
            </tr>
          </table>

          <!-- Shipping Address -->
          ${
            order.address
              ? `
          <div style="margin-bottom: 20px; background-color: #f9fafb; border-radius: 6px; padding: 15px;">
            <strong style="font-size: 14px; color: #374151;">Delivered To Address:</strong>
            <p style="margin: 5px 0 0 0; font-size: 14px; color: #4b5563; line-height: 1.5;">${order.address}</p>
          </div>
          `
              : ""
          }

          <!-- Delivered Items -->
          <h3 style="font-size: 16px; color: #111827; margin-bottom: 10px;">Delivered Items</h3>
          <ul style="padding-left: 20px; font-size: 14px; color: #374151; margin-top: 0;">
            ${itemsList}
          </ul>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background-color: #f9fafb; padding: 15px 30px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb;">
          This is an automated notification from Aruna Nighties Order System.
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
}

/**
 * Sends an email notification to Admin when a new order is placed.
 */
export async function sendOrderPlacedEmail(order: OrderData): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    logger.warn({ orderId: order.id }, "[EmailService] ADMIN_EMAIL is not configured in .env. Order placed email skipped.");
    return false;
  }

  const transporter = getTransporter();
  if (!transporter) {
    logger.warn({ orderId: order.id }, "[EmailService] SMTP credentials (SMTP_USER / SMTP_PASS) not configured in .env. Order placed email skipped.");
    return false;
  }

  const fromField = process.env.SMTP_FROM || `Aruna Nighties <${process.env.SMTP_USER}>`;

  try {
    const htmlContent = buildOrderPlacedHtml(order);
    await transporter.sendMail({
      from: fromField,
      to: adminEmail,
      subject: `[Aruna Nighties] New Order Placed (#${order.id})`,
      html: htmlContent,
    });
    logger.info({ orderId: order.id, recipient: adminEmail }, "[EmailService] Order placed email sent successfully to admin.");
    return true;
  } catch (error: any) {
    logger.error({ orderId: order.id, error: error.message }, "[EmailService] Failed to send order placed email to admin.");
    return false;
  }
}

/**
 * Sends an email notification to Admin when an order is delivered.
 */
export async function sendOrderDeliveredEmail(order: OrderData): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    logger.warn({ orderId: order.id }, "[EmailService] ADMIN_EMAIL is not configured in .env. Order delivered email skipped.");
    return false;
  }

  const transporter = getTransporter();
  if (!transporter) {
    logger.warn({ orderId: order.id }, "[EmailService] SMTP credentials (SMTP_USER / SMTP_PASS) not configured in .env. Order delivered email skipped.");
    return false;
  }

  const fromField = process.env.SMTP_FROM || `Aruna Nighties <${process.env.SMTP_USER}>`;

  try {
    const htmlContent = buildOrderDeliveredHtml(order);
    await transporter.sendMail({
      from: fromField,
      to: adminEmail,
      subject: `[Aruna Nighties] Order Delivered (#${order.id})`,
      html: htmlContent,
    });
    logger.info({ orderId: order.id, recipient: adminEmail }, "[EmailService] Order delivered email sent successfully to admin.");
    return true;
  } catch (error: any) {
    logger.error({ orderId: order.id, error: error.message }, "[EmailService] Failed to send order delivered email to admin.");
    return false;
  }
}

/**
 * Generates HTML template for New Customer Registration email notification
 */
function buildCustomerRegisteredHtml(user: UserData): string {
  const regDate = user.createdAt ? new Date(user.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>New Customer Registered - #${user.id}</title>
  </head>
  <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; color: #333333;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
      <!-- Header -->
      <tr>
        <td style="background-color: #0284c7; padding: 20px 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">Aruna Nighties</h1>
          <p style="color: #e0f2fe; margin: 5px 0 0 0; font-size: 14px;">👤 New Customer Registration</p>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding: 30px;">
          <h2 style="font-size: 18px; margin-top: 0; color: #111827;">Customer #${user.id} Details</h2>
          <p style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">Registered on ${regDate}</p>

          <!-- User Info -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px; background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 15px;">
            <tr>
              <td style="font-size: 14px; line-height: 1.8; color: #0369a1;">
                <strong>Customer ID:</strong> #${user.id}<br/>
                <strong>Phone Number:</strong> ${user.phone || "N/A"}<br/>
                <strong>Name:</strong> ${user.name || "Not provided yet"}<br/>
                <strong>Email:</strong> ${user.email || "Not provided yet"}
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background-color: #f9fafb; padding: 15px 30px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb;">
          This is an automated notification from Aruna Nighties System.
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
}

/**
 * Sends an email notification to Admin when a new customer registers.
 */
export async function sendCustomerRegisteredEmail(user: UserData): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    logger.warn({ userId: user.id }, "[EmailService] ADMIN_EMAIL is not configured in .env. Customer registered email skipped.");
    return false;
  }

  const transporter = getTransporter();
  if (!transporter) {
    logger.warn({ userId: user.id }, "[EmailService] SMTP credentials (SMTP_USER / SMTP_PASS) not configured in .env. Customer registered email skipped.");
    return false;
  }

  const fromField = process.env.SMTP_FROM || `Aruna Nighties <${process.env.SMTP_USER}>`;

  try {
    const htmlContent = buildCustomerRegisteredHtml(user);
    await transporter.sendMail({
      from: fromField,
      to: adminEmail,
      subject: `[Aruna Nighties] New Customer Registered (${user.phone || "#" + user.id})`,
      html: htmlContent,
    });
    logger.info({ userId: user.id, recipient: adminEmail }, "[EmailService] Customer registered email sent successfully to admin.");
    return true;
  } catch (error: any) {
    logger.error({ userId: user.id, error: error.message }, "[EmailService] Failed to send customer registered email to admin.");
    return false;
  }
}

