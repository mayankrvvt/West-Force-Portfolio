import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import type { Mongoose } from "mongoose";
import { sendJobDigests } from "../src/modules/jobs/digest";
import { startMongo, stopMongo } from "./helpers/mongo";

// The weekly digest with the real ranking (jobDigest.test.ts mocks it).
// sendMail and Firebase Admin are mocked, so no mail can leave.
type Mail = { to: string; subject: string; html: string; text: string };
const mocks = vi.hoisted(() => ({
  sendMail: vi.fn<(message: Mail) => Promise<unknown>>(),
}));

vi.mock("../src/lib/clients/firebase", () => ({
  firebaseApp: {},
  auth: {
    getUsers: (ids: { uid: string }[]) =>
      Promise.resolve({ users: ids.map(({ uid }) => ({ uid, email: `${uid}@example.com`, emailVerified: true })), notFound: [] }),
  },
}));

vi.mock("../src/lib/mail", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/lib/mail")>()),
  sendMail: mocks.sendMail,
}));

const NOW = new Date("2026-11-16T13:00:00Z");
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

let mongoose: Mongoose;

beforeAll(async () => {
  mongoose = await startMongo();
  mocks.sendMail.mockResolvedValue({ mode: "pretend", sent: 1, skipped: 0 });
});

afterAll(async () => {
  await stopMongo();
});

describe("sendJobDigests with the real ranking", () => {
  test("includes new matches even when more than 20 older jobs score higher", async () => {
    await mongoose.model("User").collection.insertOne({
      firebaseUid: "digest-rank",
      email: "digest-rank@example.com",
      displayName: "Emma Tremblay",
      emailVerified: true,
      jobPreferences: { titles: ["Personal support worker"], city: "Brampton", province: "", remoteOk: false, weeklyEmail: true },
      createdAt: NOW,
      updatedAt: NOW,
    });

    const Job = mongoose.model("Job");
    await Job.init(); // text index, so the $text candidate path runs
    const base = { source: "lever", title: "Personal Support Worker", description: "", tags: [] };
    await Job.create([
      // Older and stronger (title + city): 25 of them fill the top 20.
      ...Array.from({ length: 25 }, (_, i) => ({
        ...base,
        externalId: `old-${i}`,
        location: "Brampton, ON",
        url: `https://jobs.example/old-${i}`,
        postedAt: daysAgo(10 + i),
      })),
      // Newer but weaker (title only).
      ...[1, 2].map((n) => ({
        ...base,
        externalId: `new-${n}`,
        location: "Calgary, AB",
        url: `https://jobs.example/new-${n}`,
        postedAt: daysAgo(n),
      })),
    ]);

    const summary = await sendJobDigests(NOW);

    expect(summary).toMatchObject({ users: 1, sent: 1, noNewJobs: 0 });
    const html = mocks.sendMail.mock.calls[0]?.[0].html ?? "";
    expect(html).toContain("https://jobs.example/new-1");
    expect(html).toContain("https://jobs.example/new-2");
    expect(html).not.toContain("https://jobs.example/old-");
  });
});
