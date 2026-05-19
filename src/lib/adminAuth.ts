import { createHmac, timingSafeEqual } from "crypto";

const SESSION_SECRET = "aruna_nighties_super_secret_2026_fixed";

export function generateAdminToken(): string {
  const payload = `admin:${Date.now()}`;
  const sig = createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
  return Buffer.from(`${payload}:${sig}`).toString("hex");
}

export function generateUserToken(userId: number): string {
  const payload = `user:${userId}:${Date.now()}`;
  const sig = createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
  return Buffer.from(`${payload}:${sig}`).toString("hex");
}

export function verifyAdminToken(token: string): boolean {
  try {
    const decoded = Buffer.from(token, "hex").toString("utf8");
    const lastColon = decoded.lastIndexOf(":");
    if (lastColon === -1) {
      return false;
    }
    const payload = decoded.slice(0, lastColon);
    const sig = decoded.slice(lastColon + 1);
    const expected = createHmac("sha256", SESSION_SECRET)
      .update(payload)
      .digest("hex");
    
    const expectedBuf = Buffer.from(expected, "hex");
    const sigBuf = Buffer.from(sig, "hex");
    if (expectedBuf.length !== sigBuf.length) {
      return false;
    }
    return timingSafeEqual(expectedBuf, sigBuf);
  } catch (err: any) {
    console.error("DEBUG: Token verification failed:", err.message);
    return false;
  }
}

export function isAdminAuthorized(request: Request): boolean {
  const auth = request.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return false;
  }
  const token = auth.slice(7);
  return verifyAdminToken(token);
}
