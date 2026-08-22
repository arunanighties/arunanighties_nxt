import { useState, useEffect } from "react";
import { getApiBase } from "@/lib/api-config";
import { DEFAULT_SHIPPING_FEE, DEFAULT_FREE_SHIPPING_THRESHOLD, calculateShippingFee } from "@/config/shipping";

export interface SiteSettings {
  shippingFee?: string;
  freeShippingThreshold?: string;
  [key: string]: string | undefined;
}

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings>({
    shippingFee: String(DEFAULT_SHIPPING_FEE),
    freeShippingThreshold: String(DEFAULT_FREE_SHIPPING_THRESHOLD),
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const fetchSettings = async () => {
      try {
        const apiBase = getApiBase();
        const res = await fetch(`${apiBase}/api/settings`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data && typeof data === "object") {
            setSettings(data);
          }
        }
      } catch (err) {
        console.error("Failed to load site settings:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  const shippingFeeNum = parseFloat(settings.shippingFee ?? String(DEFAULT_SHIPPING_FEE)) || DEFAULT_SHIPPING_FEE;
  const freeShippingThresholdNum = parseFloat(settings.freeShippingThreshold ?? String(DEFAULT_FREE_SHIPPING_THRESHOLD)) || DEFAULT_FREE_SHIPPING_THRESHOLD;

  const getShippingFeeForSubtotal = (subtotal: number) => {
    return calculateShippingFee(subtotal, shippingFeeNum, freeShippingThresholdNum);
  };

  return {
    settings,
    shippingFee: shippingFeeNum,
    freeShippingThreshold: freeShippingThresholdNum,
    calculateShippingFee: getShippingFeeForSubtotal,
    loading,
  };
}
