import { sendOrderPlacedEmail, sendOrderDeliveredEmail, sendCustomerRegisteredEmail, OrderData, UserData } from "./email.service";
import { logger } from "@/lib/serverLogger";

/**
 * Notification Service
 * Central facade for dispatching system notifications.
 * Currently supports email notifications via NodeMailer.
 */
export class NotificationService {
  /**
   * Dispatches notifications when a new order is placed.
   * Runs asynchronously to prevent blocking request handlers.
   */
  static notifyOrderPlaced(order: OrderData): void {
    Promise.resolve().then(async () => {
      try {
        logger.info({ orderId: order.id }, "[NotificationService] Dispatching order_placed notification...");
        await sendOrderPlacedEmail(order);
      } catch (error: any) {
        logger.error({ orderId: order.id, error: error.message }, "[NotificationService] Error dispatching order_placed notification");
      }
    });
  }

  /**
   * Dispatches notifications when an order status changes to delivered.
   * Runs asynchronously to prevent blocking request handlers.
   */
  static notifyOrderDelivered(order: OrderData): void {
    Promise.resolve().then(async () => {
      try {
        logger.info({ orderId: order.id }, "[NotificationService] Dispatching order_delivered notification...");
        await sendOrderDeliveredEmail(order);
      } catch (error: any) {
        logger.error({ orderId: order.id, error: error.message }, "[NotificationService] Error dispatching order_delivered notification");
      }
    });
  }

  /**
   * Dispatches notifications when a new customer registers.
   * Runs asynchronously to prevent blocking request handlers.
   */
  static notifyCustomerRegistered(user: UserData): void {
    Promise.resolve().then(async () => {
      try {
        logger.info({ userId: user.id }, "[NotificationService] Dispatching customer_registered notification...");
        await sendCustomerRegisteredEmail(user);
      } catch (error: any) {
        logger.error({ userId: user.id, error: error.message }, "[NotificationService] Error dispatching customer_registered notification");
      }
    });
  }
}

