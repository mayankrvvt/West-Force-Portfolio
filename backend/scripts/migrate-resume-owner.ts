/*
 * Fill Resume.ownerId (Mongo User _id) from Resume.userId (Firebase uid).
 *
 *   npm run migrate:resume-owner -- --dry-run   # only report
 *   npm run migrate:resume-owner                # write
 *
 * Safe to run again: it only touches resumes without an ownerId, and each
 * update re-checks that. Resumes whose user no longer exists ("orphans")
 * are logged and left alone.
 */
import type { Types } from "mongoose";
import { config } from "../src/lib/config";
import { connectDB, disconnectDB } from "../src/lib/db";
import { logger } from "../src/lib/logger";
import Resume from "../src/modules/resumes/model";
import User from "../src/modules/users/model";

type Log = Pick<typeof logger, "info" | "warn">;

export type MigrateOptions = {
  dryRun?: boolean;
  batchSize?: number;
  log?: Log;
};

export type MigrateStats = {
  dryRun: boolean;
  scanned: number;
  updated: number;
  orphans: number;
};

export async function migrateResumeOwners({
  dryRun = false,
  batchSize = 500,
  log = logger,
}: MigrateOptions = {}): Promise<MigrateStats> {
  const stats: MigrateStats = { dryRun, scanned: 0, updated: 0, orphans: 0 };
  let lastId: Types.ObjectId | undefined;

  for (;;) {
    // Page by _id: dry runs and orphans leave ownerId empty, so a plain
    // "ownerId is null" query would return the same records forever.
    const batch = await Resume.find({
      ownerId: null,
      ...(lastId ? { _id: { $gt: lastId } } : {}),
    })
      .select("_id userId")
      .sort({ _id: 1 })
      .limit(batchSize)
      .lean();

    const last = batch.at(-1);
    if (!last) break;
    lastId = last._id;
    stats.scanned += batch.length;

    const uids = [...new Set(batch.map((resume) => resume.userId))];
    const users = await User.find({ firebaseUid: { $in: uids } })
      .select("_id firebaseUid")
      .lean();
    const ownerByUid = new Map(users.map((user) => [user.firebaseUid, user._id]));

    const updates = [];

    for (const resume of batch) {
      const ownerId = ownerByUid.get(resume.userId);

      if (!ownerId) {
        stats.orphans += 1;
        log.warn({ resumeId: String(resume._id), userId: resume.userId }, "Resume has no matching user; left unchanged");
        continue;
      }

      updates.push({
        updateOne: {
          filter: { _id: resume._id, ownerId: null },
          update: { $set: { ownerId } },
        },
      });
    }

    if (dryRun) {
      stats.updated += updates.length;
    } else if (updates.length) {
      const result = await Resume.bulkWrite(updates, { ordered: false });
      stats.updated += result.modifiedCount;
    }

    log.info({ ...stats }, dryRun ? "Batch checked (dry run)" : "Batch migrated");
  }

  log.info({ ...stats }, dryRun ? "Dry run finished; nothing was written" : "Migration finished");

  return stats;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");

  await connectDB(config.MONGODB_URI);

  try {
    await migrateResumeOwners({ dryRun });
  } finally {
    await disconnectDB();
  }
}

// Run only when started directly (not when a test imports it).
if (typeof require !== "undefined" && require.main === module) {
  main().catch((error: unknown) => {
    logger.error({ err: error }, "Resume owner migration failed");
    process.exitCode = 1;
  });
}
