/*
 * Collect Canadian jobs once: npm run jobs:collect
 *
 * Runs daily from .github/workflows/collect-jobs.yml, or from the server's own
 * cron. Exits with code 1 when the database fails or every source fails.
 */
import { config } from "../lib/config";
import { connectDB, disconnectDB } from "../lib/db";
import { logger } from "../lib/logger";
import { collectJobs } from "../modules/jobs/collect";

async function main(): Promise<number> {
  await connectDB(config.MONGODB_URI);

  try {
    const summary = await collectJobs();
    return summary.tried > 0 && summary.failed === summary.tried ? 1 : 0;
  } finally {
    await disconnectDB();
  }
}

main()
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    logger.error({ reason: error instanceof Error ? error.message : "unknown" }, "Job collection failed");
    process.exit(1);
  });
