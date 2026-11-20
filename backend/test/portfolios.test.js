import { afterAll, beforeAll, describe, expect, test } from "vitest";
import request from "supertest";
import { loadApp, testUsers } from "./helpers/app";
import { startMongo, stopMongo } from "./helpers/mongo";

// Characterization tests: pin /api/portfolios CRUD, publish gating and the
// public slug page. Fake Firebase + in-memory MongoDB, no real services.
let app;
let mongoose;
let userCounter = 0;

beforeAll(async () => {
  mongoose = await startMongo();
  app = await loadApp();
  // Build unique indexes now so duplicate slugs are rejected in tests.
  await mongoose.model("Portfolio").init();
});

afterAll(async () => {
  testUsers.clear();
  await stopMongo();
});

/** A signed-in user with a Mongo User record (and optionally a paid plan). */
async function newUser({ paid = false, withRecord = true } = {}) {
  userCounter += 1;
  const uid = `uid-portfolio-${userCounter}`;
  const email = `portfolio${userCounter}@example.com`;
  const token = `token-portfolio-${userCounter}`;
  testUsers.set(token, { uid, email, email_verified: true });

  if (withRecord) {
    await mongoose.model("User").create({ firebaseUid: uid, email });
  }

  if (paid) {
    await mongoose.model("Entitlement").create({
      email,
      firebaseUid: uid,
      plan: "solo",
      purchaseId: new mongoose.Types.ObjectId(),
      grantedAt: new Date(),
    });
  }

  return { uid, token, slug: `user-${userCounter}` };
}

function as(token, req) {
  return req.set("Authorization", `Bearer ${token}`);
}

describe("auth and missing records", () => {
  test("GET /me without a token -> 401", async () => {
    const res = await request(app).get("/api/portfolios/me");
    expect(res.status).toBe(401);
  });

  test("GET /me with no Mongo user -> 404 User not found", async () => {
    const user = await newUser({ withRecord: false });
    const res = await as(user.token, request(app).get("/api/portfolios/me"));
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("User not found.");
  });

  test("GET /me / PUT /me / DELETE /me with no portfolio -> 404", async () => {
    const user = await newUser();

    for (const req of [
      request(app).get("/api/portfolios/me"),
      request(app).put("/api/portfolios/me").send({ template: "x" }),
      request(app).delete("/api/portfolios/me"),
    ]) {
      const res = await as(user.token, req);
      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Portfolio not found.");
    }
  });
});

describe("create, read, update, delete", () => {
  test("POST / creates a draft, normalises the slug and hides pinHash", async () => {
    const user = await newUser();

    const res = await as(
      user.token,
      request(app)
        .post("/api/portfolios")
        .send({ slug: `  ${user.slug.toUpperCase()} `, profile: { name: "Ann" } })
    );

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("Portfolio created successfully.");
    expect(res.body.portfolio.slug).toBe(user.slug);
    expect(res.body.portfolio.status).toBe("draft");
    expect(res.body.portfolio.publishedAt).toBeNull();
    expect(res.body.portfolio.profile.name).toBe("Ann");
    expect(res.body.portfolio.documentProtection.enabled).toBe(false);
    expect(res.body.portfolio.documentProtection).not.toHaveProperty("pinHash");

    const again = await as(
      user.token,
      request(app).post("/api/portfolios").send({ slug: `${user.slug}-2` })
    );
    expect(again.status).toBe(409);
    expect(again.body.message).toBe("You already have a portfolio.");
  });

  test("POST / with a slug another user owns -> 409", async () => {
    const first = await newUser();
    const second = await newUser();

    await as(first.token, request(app).post("/api/portfolios").send({ slug: first.slug }));
    const res = await as(
      second.token,
      request(app).post("/api/portfolios").send({ slug: first.slug })
    );

    expect(res.status).toBe(409);
    expect(res.body.message).toBe("That portfolio URL is already in use.");
  });

  test("POST / with protection on and a bad PIN -> 400", async () => {
    const user = await newUser();
    const res = await as(
      user.token,
      request(app)
        .post("/api/portfolios")
        .send({ slug: user.slug, documentProtection: { enabled: true, pin: "12" } })
    );

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/PIN must contain exactly \d digits\./);
  });

  test("GET /me returns the owner's portfolio", async () => {
    const user = await newUser();
    await as(user.token, request(app).post("/api/portfolios").send({ slug: user.slug }));

    const res = await as(user.token, request(app).get("/api/portfolios/me"));

    expect(res.status).toBe(200);
    expect(res.body.portfolio.slug).toBe(user.slug);
  });

  test("PUT /me changes allowed fields only", async () => {
    const user = await newUser();
    const created = await as(
      user.token,
      request(app).post("/api/portfolios").send({ slug: user.slug })
    );

    const res = await as(
      user.token,
      request(app)
        .put("/api/portfolios/me")
        .send({
          template: "modern",
          hero: { headline: "Builder" },
          userId: new mongoose.Types.ObjectId().toString(),
        })
    );

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Portfolio updated successfully.");
    expect(res.body.portfolio.template).toBe("modern");
    expect(res.body.portfolio.hero.headline).toBe("Builder");
    expect(res.body.portfolio.userId).toBe(created.body.portfolio.userId);
  });

  test("DELETE /me deletes, then 404", async () => {
    const user = await newUser();
    await as(user.token, request(app).post("/api/portfolios").send({ slug: user.slug }));

    const res = await as(user.token, request(app).delete("/api/portfolios/me"));
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Portfolio deleted successfully.");

    const again = await as(user.token, request(app).delete("/api/portfolios/me"));
    expect(again.status).toBe(404);
  });
});

describe("publish needs a paid plan", () => {
  test("unpaid POST / and PUT /me with status published -> 402", async () => {
    const user = await newUser();

    const create = await as(
      user.token,
      request(app).post("/api/portfolios").send({ slug: user.slug, status: "published" })
    );
    expect(create.status).toBe(402);
    expect(create.body.code).toBe("PAYMENT_REQUIRED");

    await as(user.token, request(app).post("/api/portfolios").send({ slug: user.slug }));
    const update = await as(
      user.token,
      request(app).put("/api/portfolios/me").send({ status: "published" })
    );
    expect(update.status).toBe(402);
  });

  test("paid user publishes (publishedAt set, kept), unpublish clears it", async () => {
    const user = await newUser({ paid: true });

    const create = await as(
      user.token,
      request(app).post("/api/portfolios").send({ slug: user.slug, status: "published" })
    );
    expect(create.status).toBe(201);
    expect(create.body.portfolio.status).toBe("published");
    const publishedAt = create.body.portfolio.publishedAt;
    expect(publishedAt).toBeTruthy();

    const edit = await as(
      user.token,
      request(app).put("/api/portfolios/me").send({ template: "t2" })
    );
    expect(edit.body.portfolio.publishedAt).toBe(publishedAt);

    const draft = await as(
      user.token,
      request(app).put("/api/portfolios/me").send({ status: "draft" })
    );
    expect(draft.status).toBe(200);
    expect(draft.body.portfolio.publishedAt).toBeNull();
  });

  test("any other status value is stored as draft on create", async () => {
    const user = await newUser();
    const res = await as(
      user.token,
      request(app).post("/api/portfolios").send({ slug: user.slug, status: "weird" })
    );
    expect(res.status).toBe(201);
    expect(res.body.portfolio.status).toBe("draft");
  });
});

describe("public GET /:slug", () => {
  test("draft portfolio is not public", async () => {
    const user = await newUser();
    await as(user.token, request(app).post("/api/portfolios").send({ slug: user.slug }));

    const res = await request(app).get(`/api/portfolios/${user.slug}`);
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Published portfolio not found.");
  });

  test("published portfolio hides file details and rewrites the resume URL", async () => {
    const user = await newUser({ paid: true });
    await as(
      user.token,
      request(app)
        .post("/api/portfolios")
        .send({
          slug: user.slug,
          status: "published",
          documents: [
            {
              name: "Cert.pdf",
              type: "certificate",
              fileUrl: "https://res.cloudinary.com/x/cert.pdf",
              publicId: "secret-id",
              size: 10,
            },
          ],
          resume: { name: "cv.pdf", fileUrl: "https://res.cloudinary.com/x/cv.pdf" },
        })
    );

    const res = await request(app).get(`/api/portfolios/${user.slug.toUpperCase()}`);

    expect(res.status).toBe(200);
    expect(res.body.portfolio.slug).toBe(user.slug);
    expect(res.body.portfolio.documents).toHaveLength(1);
    expect(res.body.portfolio.documents[0]).toEqual({
      _id: expect.any(String),
      name: "Cert.pdf",
      type: "certificate",
      size: 10,
      protected: true,
    });
    expect(res.body.portfolio.resume).toEqual({
      name: "cv.pdf",
      fileUrl: `/api/portfolios/${user.slug}/resume`,
    });
    expect(JSON.stringify(res.body)).not.toContain("pinHash");
    expect(JSON.stringify(res.body)).not.toContain("secret-id");
  });
});

describe("GET /:slug/resume", () => {
  test("a stored resume link that is not a valid URL -> 404, not 500", async () => {
    const user = await newUser({ paid: true });
    await as(
      user.token,
      request(app)
        .post("/api/portfolios")
        .send({ slug: user.slug, status: "published", resume: { name: "cv.pdf", fileUrl: "not a url" } })
    );

    const res = await request(app).get(`/api/portfolios/${user.slug}/resume`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe("PUT /me/document-protection", () => {
  test("disable -> 200 with enabled false", async () => {
    const user = await newUser();
    await as(user.token, request(app).post("/api/portfolios").send({ slug: user.slug }));

    const res = await as(
      user.token,
      request(app).put("/api/portfolios/me/document-protection").send({ enabled: false })
    );

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Document protection disabled.");
    expect(res.body.documentProtection).toEqual({ enabled: false });
  });

  test("bad PIN -> 400", async () => {
    const user = await newUser();
    await as(user.token, request(app).post("/api/portfolios").send({ slug: user.slug }));

    const res = await as(
      user.token,
      request(app)
        .put("/api/portfolios/me/document-protection")
        .send({ enabled: true, pin: "12a" })
    );

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/PIN must contain exactly \d digits\./);
  });
});
