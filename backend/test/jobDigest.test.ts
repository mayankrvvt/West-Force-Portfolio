import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import type { Mongoose } from "mongoose";
import { DIGEST_MAX_JOBS, sendJobDigests } from "../src/modules/jobs/digest";
import { startMongo, stopMongo } from "./helpers/mongo";

// Weekly "new jobs for you" email. sendMail and the ranking are mocked, so
// no mail can leave and the test controls which jobs each user matches.
type Mail = { to: string; subject: string; html: string; text: string };
type RankedJob = { title: string; company: string; location: string; url: string; postedAt: Date };
type FirebaseRecord = { uid: string; email?: string; emailVerified: boolean };
const mocks = vi.hoisted(() => ({
  sendMail: vi.fn<(message: Mail) => Promise<unknown>>(),
  rankJobsForUser: vi.fn<(user: { firebaseUid: string }) => Promise<RankedJob[]>>(),
  getUsers: vi.fn<(ids: { uid: string }[]) => Promise<{ users: FirebaseRecord[]; notFound: { uid: string }[] }>>(),
}));

// Firebase Admin is mocked: getUsers is the source of truth for the address.
vi.mock("../src/lib/clients/firebase", () => ({ firebaseApp: {}, auth: { getUsers: mocks.getUsers } }));

/** Firebase answers with these records; by default the same verified address as Mongo. */
const firebaseRecord = (uid: string): FirebaseRecord | null => ({ uid, email: `${uid}@example.com`, emailVerified: true });
const answerWith = (recordFor: (uid: string) => FirebaseRecord | null) =>
  mocks.getUsers.mockImplementation((ids) => {
    const users = ids.map(({ uid }) => recordFor(uid)).filter((record): record is FirebaseRecord => record !== null);
    return Promise.resolve({ users, notFound: ids.filter(({ uid }) => !users.some((user) => user.uid === uid)) });
  });

vi.mock("../src/lib/mail", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/lib/mail")>()),
  sendMail: mocks.sendMail,
}));

vi.mock("../src/modules/jobs/service", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/modules/jobs/service")>()),
  rankJobsForUser: mocks.rankJobsForUser,
}));

const NOW = new Date("2026-11-16T13:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(NOW.getTime() - days * DAY);

let mongoose: Mongoose;

const job = (id: number, postedDaysAgo: number) => ({
  _id: `job-${id}`,
  title: `Personal support worker ${id}`,
  company: "Peel Home Care",
  location: "Brampton, ON",
  url: `https://jobs.example/${id}`,
  postedAt: daysAgo(postedDaysAgo),
});

async function addUser(uid: string, fields: { weeklyEmail?: boolean; emailVerified?: boolean }) {
  await mongoose.model("User").collection.insertOne({
    firebaseUid: uid,
    email: `${uid}@example.com`,
    displayName: "Emma Tremblay",
    emailVerified: fields.emailVerified ?? false,
    jobPreferences: { weeklyEmail: fields.weeklyEmail ?? false },
    createdAt: NOW,
    updatedAt: NOW,
  });
}

beforeAll(async () => {
  mongoose = await startMongo();
  await addUser("opted-in", { weeklyEmail: true, emailVerified: true });
  await addUser("only-old-jobs", { weeklyEmail: true, emailVerified: true });
  await addUser("many-jobs", { weeklyEmail: true, emailVerified: true });
  await addUser("not-opted-in", { weeklyEmail: false, emailVerified: true });
  await addUser("not-verified", { weeklyEmail: true, emailVerified: false });
});

afterAll(async () => {
  await stopMongo();
});

beforeEach(() => {
  mocks.sendMail.mockReset().mockResolvedValue({ mode: "pretend", sent: 1, skipped: 0 });
  mocks.getUsers.mockReset();
  answerWith(firebaseRecord);
  mocks.rankJobsForUser.mockReset().mockImplementation((user) => {
    if (user.firebaseUid === "only-old-jobs") return Promise.resolve([job(1, 8), job(2, 30)]);
    if (user.firebaseUid === "many-jobs") return Promise.resolve(Array.from({ length: 15 }, (_, i) => job(100 + i, 1)));
    return Promise.resolve([job(3, 2), job(4, 10)]);
  });
});

describe("sendJobDigests", () => {
  test("mails only opted in, verified users, and skips users with no new jobs", async () => {
    const summary = await sendJobDigests(NOW);

    expect(summary).toEqual({ users: 3, sent: 2, noNewJobs: 1, skipped: 0, failed: 0 });
    const ranked = mocks.rankJobsForUser.mock.calls.map(([user]) => user.firebaseUid).sort();
    expect(ranked).toEqual(["many-jobs", "only-old-jobs", "opted-in"]);
    expect(mocks.sendMail.mock.calls.map(([message]) => message.to).sort()).toEqual([
      "many-jobs@example.com",
      "opted-in@example.com",
    ]);
  });

  test("keeps only last week's jobs and at most ten per email", async () => {
    await sendJobDigests(NOW);

    const mailTo = (to: string) => {
      const message = mocks.sendMail.mock.calls.find(([sent]) => sent.to === to)?.[0];
      if (!message) throw new Error(`No digest sent to ${to}`);
      return message;
    };

    const optedIn = mailTo("opted-in@example.com");
    expect(optedIn.subject).toBe("1 new job for you this week");
    expect(optedIn.html).toContain("https://jobs.example/3");
    expect(optedIn.html).not.toContain("https://jobs.example/4");
    expect(optedIn.html).toContain("/dashboard/settings#job-preferences");

    const many = mailTo("many-jobs@example.com");
    expect(many.subject).toBe(`${DIGEST_MAX_JOBS} new jobs for you this week`);
    expect(many.html).toContain("https://jobs.example/109");
    expect(many.html).not.toContain("https://jobs.example/110");
  });

  test("mails the Firebase Auth address only, and nobody whose Firebase address is not verified", async () => {
    answerWith((uid) => {
      if (uid === "opted-in") return { uid, email: "real.owner@example.com", emailVerified: true };
      if (uid === "many-jobs") return { uid, email: "many-jobs@example.com", emailVerified: false };
      return firebaseRecord(uid);
    });

    await sendJobDigests(NOW);

    expect(mocks.sendMail.mock.calls.map(([message]) => message.to)).toEqual(["real.owner@example.com"]);
    for (const [ids] of mocks.getUsers.mock.calls) expect(ids.length).toBeLessThanOrEqual(100);
  });

  test("one user's failure does not stop the others", async () => {
    mocks.sendMail.mockRejectedValueOnce(new Error("Mail send failed (rate_limit_exceeded)."));

    const summary = await sendJobDigests(NOW);

    expect(summary.failed).toBe(1);
    expect(summary.sent).toBe(1);
    expect(mocks.sendMail).toHaveBeenCalledTimes(2);
  });
});
