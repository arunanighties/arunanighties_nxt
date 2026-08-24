import { timingSafeEqual } from "crypto";
import { logger } from "@/lib/serverLogger";

/**
 * Verifies the incoming HTTP request against the server-side CRON_SECRET environment variable.
 * Expects header: "Authorization: Bearer <CRON_SECRET>"
 */
export function verifyCronSecret(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || cronSecret.trim() === "") {
    logger.warn("[CronAuth] CRON_SECRET environment variable is not configured on server");
    return false;
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return false;
  }

  try {
    const tokenBuf = Buffer.from(token, "utf8");
    const secretBuf = Buffer.from(cronSecret, "utf8");

    if (tokenBuf.length !== secretBuf.length) {
      return false;
    }

    return timingSafeEqual(tokenBuf, secretBuf);
  } catch (err: any) {
    logger.error({ error: err.message }, "[CronAuth] Error verifying CRON_SECRET");
    return false;
  }
}
