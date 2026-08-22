/**
 * Default shipping configuration (in Rupees).
 * These can be dynamically overridden by site settings in the admin panel.
 */
export const DEFAULT_SHIPPING_FEE = 99;
export const DEFAULT_FREE_SHIPPING_THRESHOLD = 3999;

/**
 * Calculates shipping fee based on subtotal, fee, and free shipping threshold.
 */
export function calculateShippingFee(
  subtotal: number,
  shippingFee: number = DEFAULT_SHIPPING_FEE,
  freeShippingThreshold: number = DEFAULT_FREE_SHIPPING_THRESHOLD
): number {
  if (subtotal >= freeShippingThreshold) {
    return 0;
  }
  return shippingFee;
}
