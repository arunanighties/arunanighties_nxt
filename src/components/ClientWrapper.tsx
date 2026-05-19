"use client";

import { useEffect, useState } from "react";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";
import { getApiBase } from "@/lib/api-config";
import App from "@/App";

export default function ClientWrapper() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Run initialization once on mount in the browser
    setBaseUrl(getApiBase());
    setAuthTokenGetter(() => {
      if (typeof window === "undefined") return null;
      const token = localStorage.getItem("adminToken");
      if (!token || token === "undefined" || token === "null") return null;
      return token;
    });
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-pink-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  return <App />;
}
