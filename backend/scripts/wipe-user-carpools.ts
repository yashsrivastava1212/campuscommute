/**
 * Cancel all carpools owned by a GIM user (fresh start).
 * Usage: npx tsx scripts/wipe-user-carpools.ts user@example.gim.ac.in
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../src/db/index.js";
import { users } from "../src/db/schema.js";
import { wipeAllOwnedCarpools } from "../src/services/carpool.service.js";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error("Usage: npx tsx scripts/wipe-user-carpools.ts <campus-email>");
    process.exit(1);
  }

  const [user] = await db
    .select({ id: users.id, campusEmail: users.campusEmail })
    .from(users)
    .where(eq(users.campusEmail, email))
    .limit(1);

  if (!user) {
    console.error(`No user found for ${email}`);
    process.exit(1);
  }

  const cancelled = await wipeAllOwnedCarpools(user.id);
  console.log(`Cancelled ${cancelled} carpool(s) for ${user.campusEmail}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
