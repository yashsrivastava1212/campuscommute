import "../env.js";
import { db } from "./index.js";
import { seedDatabase } from "./seed-data.js";

seedDatabase(db)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
