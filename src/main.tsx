import { createRoot } from "react-dom/client";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";
import { getApiBase } from "./lib/api-config";
import App from "./App";
import "./index.css";

setBaseUrl(getApiBase());
setAuthTokenGetter(() => {
  const token = localStorage.getItem("adminToken");
  if (!token || token === "undefined" || token === "null") return null;
  return token;
});

createRoot(document.getElementById("root")!).render(<App />);
