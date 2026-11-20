import { auth } from "../../lib/clients/firebase";
import { logger } from "../../lib/logger";
import { jobDigestEmail, sendMail, type DigestJob } from "../../lib/mail";
import User, { type UserDocument } from "../users/model";
import { rankJobsForUser } from "./service";

/** Only jobs posted in this many days go in the weekly email. */
export const DIGEST_DAYS = 7;
/** At most this many jobs per email. */
export const DIGEST_MAX_JOBS = 10;
/** Firebase Admin getUsers takes at most 100 accounts per call. */
const FIREBASE_BATCH = 100;

export type DigestSummary = {
  /** Opted in, verified users looked at. */
  users: number;
  sent: number;
  /** Users with no new matching jobs this week. */
  noNewJobs: number;
  /** Users Firebase Auth has no verified email for: nothing sent. */
  skipped: number;
  failed: number;
};

const toTime = (value: unknown) => {
  const time = value instanceof Date ? value.getTime() : typeof value === "string" ? Date.parse(value) : NaN;
  return Number.isFinite(time) ? time : 0;
};
const textOf = (value: unknown) => (typeof value === "string" ? value : "");

/**
 * The weekly "new jobs for you" email (npm run jobs:digest). For each user
 * who opted in (jobPreferences.weeklyEmail) and has a verified email, take
 * their "Jobs for you" ranking, keep jobs posted in the last DIGEST_DAYS and
 * send up to DIGEST_MAX_JOBS. Users with none get nothing. One user's
 * failure never stops the others.
 *
 * The email goes to the address in Firebase Auth (never the stored one), and
 * only when Firebase says it is verified; other users are skipped.
 */
export async function sendJobDigests(now = new Date()): Promise<DigestSummary> {
  const since = now.getTime() - DIGEST_DAYS * 24 * 60 * 60 * 1000;
  const summary: DigestSummary = { users: 0, sent: 0, noNewJobs: 0, skipped: 0, failed: 0 };

  const users = User.find({ "jobPreferences.weeklyEmail": true, emailVerified: true }).cursor();
  let batch: UserDocument[] = [];

  for await (const user of users) {
    batch.push(user);
    if (batch.length === FIREBASE_BATCH) {
      await sendBatch(batch, now, since, summary);
      batch = [];
    }
  }
  if (batch.length > 0) await sendBatch(batch, now, since, summary);

  logger.info(summary, "Job digest finished");
  return summary;
}

/** Firebase uid -> email, for accounts whose email Firebase says is verified. */
async function verifiedEmails(users: UserDocument[]): Promise<Map<string, string>> {
  const result = await auth.getUsers(users.map((user) => ({ uid: user.firebaseUid })));
  const emails = new Map<string, string>();
  for (const record of result.users) {
    if (record.email && record.emailVerified) emails.set(record.uid, record.email);
  }
  return emails;
}

async function sendBatch(users: UserDocument[], now: Date, since: number, summary: DigestSummary): Promise<void> {
  summary.users += users.length;

  let emails: Map<string, string>;
  try {
    emails = await verifiedEmails(users);
  } catch (error) {
    summary.failed += users.length;
    logger.error({ users: users.length, reason: error instanceof Error ? error.message : "unknown" }, "Job digest could not check emails in Firebase");
    return;
  }

  for (const user of users) {
    const to = emails.get(user.firebaseUid);
    if (!to) {
      summary.skipped += 1;
      continue;
    }

    try {
      // Filter in the query too, so older higher scored jobs can't fill the top N.
      const fresh = (await rankJobsForUser(user, now, { postedSince: new Date(since) }))
        .filter((job) => toTime(job.postedAt) >= since)
        .slice(0, DIGEST_MAX_JOBS);

      if (fresh.length === 0) {
        summary.noNewJobs += 1;
        continue;
      }

      const jobs: DigestJob[] = fresh.map((job) => ({
        title: textOf(job.title),
        company: textOf(job.company),
        location: textOf(job.location),
        url: textOf(job.url),
      }));

      await sendMail({ to, ...jobDigestEmail(jobs, user.displayName) });
      summary.sent += 1;
    } catch (error) {
      summary.failed += 1;
      logger.error({ userId: user.id, reason: error instanceof Error ? error.message : "unknown" }, "Job digest failed for a user");
    }
  }
}
