import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

async function runTests() {
  console.log("\n🧪 Running Cron Sync Unit & Security Tests...\n");

  const { verifyCronSecret } = await import("../src/lib/cronAuth.ts");
  const {
    mapXpressbeesStatusToInternal,
    isHigherStatus,
  } = await import("../src/services/shipping/sync-shipping.service.ts");

  // -------------------------------------------------------------
  // 1. Authentication Tests (CRON_SECRET)
  // -------------------------------------------------------------
  console.log("▶ Testing Authentication & Secret Verification...");
  const origSecret = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "test_super_secret_key_12345";

  // Test: Missing Header
  const reqNoHeader = new Request("http://localhost:3000/api/cron/sync-shipping");
  assert(verifyCronSecret(reqNoHeader) === false, "Rejects request with no Authorization header");

  // Test: Invalid Header format
  const reqBadFormat = new Request("http://localhost:3000/api/cron/sync-shipping", {
    headers: { authorization: "Basic test_super_secret_key_12345" },
  });
  assert(verifyCronSecret(reqBadFormat) === false, "Rejects request with non-Bearer Authorization scheme");

  // Test: Wrong Secret
  const reqWrongSecret = new Request("http://localhost:3000/api/cron/sync-shipping", {
    headers: { authorization: "Bearer WRONG_SECRET_KEY" },
  });
  assert(verifyCronSecret(reqWrongSecret) === false, "Rejects request with incorrect CRON_SECRET");

  // Test: Empty Secret Token
  const reqEmptyToken = new Request("http://localhost:3000/api/cron/sync-shipping", {
    headers: { authorization: "Bearer " },
  });
  assert(verifyCronSecret(reqEmptyToken) === false, "Rejects request with empty Bearer token");

  // Test: Correct Secret
  const reqValid = new Request("http://localhost:3000/api/cron/sync-shipping", {
    headers: { authorization: "Bearer test_super_secret_key_12345" },
  });
  assert(verifyCronSecret(reqValid) === true, "Accepts request with valid CRON_SECRET");

  // Test: Unconfigured Server Secret
  delete process.env.CRON_SECRET;
  assert(verifyCronSecret(reqValid) === false, "Rejects request safely when server CRON_SECRET is unconfigured");
  process.env.CRON_SECRET = origSecret || "aruna_cron_secret_2026_local";

  // -------------------------------------------------------------
  // 2. Status Mapping Tests
  // -------------------------------------------------------------
  console.log("\n▶ Testing Xpressbees Status Mapping...");
  assert(mapXpressbeesStatusToInternal("pending pickup") === "SHIPPED", "Maps 'pending pickup' -> 'SHIPPED'");
  assert(mapXpressbeesStatusToInternal("manifested") === "SHIPPED", "Maps 'manifested' -> 'SHIPPED'");
  assert(mapXpressbeesStatusToInternal("in transit") === "IN TRANSIT", "Maps 'in transit' -> 'IN TRANSIT'");
  assert(mapXpressbeesStatusToInternal("on the way") === "IN TRANSIT", "Maps 'on the way' -> 'IN TRANSIT'");
  assert(mapXpressbeesStatusToInternal("out for delivery") === "OUT FOR DELIVERY", "Maps 'out for delivery' -> 'OUT FOR DELIVERY'");
  assert(mapXpressbeesStatusToInternal("delivered") === "DELIVERED", "Maps 'delivered' -> 'DELIVERED'");
  assert(mapXpressbeesStatusToInternal("unknown status xy") === null, "Maps unknown status -> null");
  assert(mapXpressbeesStatusToInternal(null) === null, "Handles null ship_status gracefully");

  // -------------------------------------------------------------
  // 3. Status Downgrade Protection Tests
  // -------------------------------------------------------------
  console.log("\n▶ Testing Backend Status Downgrade Protection...");

  // Valid Progression (Upgrades)
  assert(isHigherStatus("SHIPPED", "IN TRANSIT") === true, "Allows SHIPPED -> IN TRANSIT");
  assert(isHigherStatus("IN TRANSIT", "OUT FOR DELIVERY") === true, "Allows IN TRANSIT -> OUT FOR DELIVERY");
  assert(isHigherStatus("OUT FOR DELIVERY", "DELIVERED") === true, "Allows OUT FOR DELIVERY -> DELIVERED");

  // Prevented Downgrades
  assert(isHigherStatus("DELIVERED", "IN TRANSIT") === false, "Blocks DELIVERED -> IN TRANSIT");
  assert(isHigherStatus("DELIVERED", "SHIPPED") === false, "Blocks DELIVERED -> SHIPPED");
  assert(isHigherStatus("OUT FOR DELIVERY", "SHIPPED") === false, "Blocks OUT FOR DELIVERY -> SHIPPED");
  assert(isHigherStatus("IN TRANSIT", "SHIPPED") === false, "Blocks IN TRANSIT -> SHIPPED");

  // Redundant Same-Status Updates
  assert(isHigherStatus("IN TRANSIT", "IN TRANSIT") === false, "Blocks redundant same-status update IN TRANSIT -> IN TRANSIT");
  assert(isHigherStatus("DELIVERED", "DELIVERED") === false, "Blocks redundant same-status update DELIVERED -> DELIVERED");

  console.log("\n✅ All unit and security tests passed successfully!\n");
}

runTests().catch((err) => {
  console.error("❌ Test suite failed:", err);
  process.exit(1);
});
