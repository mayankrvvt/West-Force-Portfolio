/*
 * Send the weekly "new jobs for you" email once: npm run jobs:digest
 *
 * Runs weekly from .github/workflows/job-digest.yml. Mail is only really sent
 * when MAIL_MODE=live with RESEND_API_KEY and MAIL_FROM set; otherwise it is
 * logged and skipped (see src/lib/mail). Exits with code 1 when the database
 * fails or any user's email failed.
 */
import { config } from "../lib/config";
import { connectDB, disconnectDB } from "../lib/db";
import { logger } from "../lib/logger";
import { sendJobDigests } from "../modules/jobs/digest";

async function main(): Promise<number> {
  await connectDB(config.MONGODB_URI);

  try {
    const summary = await sendJobDigests();
    return summary.failed > 0 ? 1 : 0;
  } finally {
    await disconnectDB();
  }
}

main()
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    logger.error({ reason: error instanceof Error ? error.message : "unknown" }, "Job digest failed");
    process.exit(1);
  });
