import { runSeed } from "../src/scripts/seed.js";

runSeed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
