import { PGlite } from "@electric-sql/pglite";
console.log("Starting minimal PGlite test...");
try {
  const db = new PGlite("memory://");
  await db.waitReady;
  console.log("PGlite ready!");
  await db.close();
  console.log("PGlite closed!");
} catch (err) {
  console.error("PGlite error:", err);
}
