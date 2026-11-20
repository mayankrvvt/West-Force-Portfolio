import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { startMongo, stopMongo } from "./helpers/mongo";

// scripts/migrate-resume-owner.ts against in-memory MongoDB.
let mongoose;
let Resume;
let User;
let migrateResumeOwners;

const silent = { info: () => {}, warn: () => {} };

beforeAll(async () => {
  mongoose = await startMongo();
  ({ migrateResumeOwners } = await import("../scripts/migrate-resume-owner"));
  Resume = mongoose.model("Resume");
  User = mongoose.model("User");
});

afterAll(async () => {
  await stopMongo();
});

beforeEach(async () => {
  await Resume.deleteMany({});
  await User.deleteMany({});
});

async function seed() {
  const alice = await User.create({ firebaseUid: "uid-alice", email: "alice@example.com" });
  const bob = await User.create({ firebaseUid: "uid-bob", email: "bob@example.com" });

  await Resume.create([
    { userId: "uid-alice", title: "A1" },
    { userId: "uid-alice", title: "A2" },
    { userId: "uid-bob", title: "B1" },
    { userId: "uid-gone", title: "Orphan" },
    { userId: "uid-bob", ownerId: bob._id, title: "Already done" },
  ]);

  return { alice, bob };
}

describe("migrateResumeOwners", () => {
  test("fills ownerId from userId and leaves orphans alone", async () => {
    const { alice, bob } = await seed();
    const warnings = [];
    const log = { info: () => {}, warn: (data) => warnings.push(data) };

    const stats = await migrateResumeOwners({ batchSize: 2, log });

    expect(stats).toEqual({ dryRun: false, scanned: 4, updated: 3, orphans: 1 });

    const byTitle = Object.fromEntries(
      (await Resume.find().lean()).map((r) => [r.title, r])
    );
    expect(String(byTitle.A1.ownerId)).toBe(String(alice._id));
    expect(String(byTitle.A2.ownerId)).toBe(String(alice._id));
    expect(String(byTitle.B1.ownerId)).toBe(String(bob._id));
    expect(byTitle.Orphan.ownerId ?? null).toBeNull();
    expect(byTitle.Orphan.userId).toBe("uid-gone");

    expect(warnings).toEqual([
      { resumeId: String(byTitle.Orphan._id), userId: "uid-gone" },
    ]);
  });

  test("dry run reports but writes nothing", async () => {
    await seed();

    const stats = await migrateResumeOwners({ dryRun: true, batchSize: 2, log: silent });

    expect(stats).toEqual({ dryRun: true, scanned: 4, updated: 3, orphans: 1 });
    expect(await Resume.countDocuments({ ownerId: null })).toBe(4);
  });

  test("running twice changes nothing the second time", async () => {
    await seed();

    await migrateResumeOwners({ log: silent });
    const before = await Resume.find().sort({ _id: 1 }).lean();
    const second = await migrateResumeOwners({ log: silent });
    const after = await Resume.find().sort({ _id: 1 }).lean();

    expect(second).toEqual({ dryRun: false, scanned: 1, updated: 0, orphans: 1 });
    expect(after).toEqual(before);
  });
});
