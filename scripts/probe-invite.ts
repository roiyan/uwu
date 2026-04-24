// Load env vars BEFORE importing anything that touches process.env.
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

async function main() {
  // Dynamic import so env loads first.
  const { resolveInviteToken } = await import("../src/lib/actions/collaborator");
  console.log("Probing resolveInviteToken (against configured DB)...");

  const fake = "fake-token-for-smoke-test-12345";
  const result = await resolveInviteToken(fake);
  console.log("[fake]", result);

  const realShape = "bBmtL7JkCDutAHCZXeszoBe9ejKSgJPt";
  const result2 = await resolveInviteToken(realShape);
  console.log("[real-shape]", result2);

  process.exit(0);
}

main().catch((err) => {
  console.error("Probe failed:", err);
  process.exit(1);
});
