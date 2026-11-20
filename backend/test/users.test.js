import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import request from "supertest";
import { loadApp, testUsers } from "./helpers/app";
import { startMongo, stopMongo } from "./helpers/mongo";

// Characterization tests: pin the current /api/users behaviour.
let app;
let mongoose;

const ALICE = {
  uid: "uid-alice",
  email: "alice@example.com",
  email_verified: true,
  name: "Alice Token",
  picture: "https://img.example.com/alice.png",
};
const NO_EMAIL = { uid: "uid-no-email" };

beforeAll(async () => {
  testUsers.set("token-alice", ALICE);
  testUsers.set("token-no-email", NO_EMAIL);
  mongoose = await startMongo();
  app = await loadApp();
});

afterAll(async () => {
  testUsers.clear();
  await stopMongo();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function as(token, req) {
  return req.set("Authorization", `Bearer ${token}`);
}

describe("auth on /api/users", () => {
  test("no Authorization header -> 401", async () => {
    const res = await request(app).get("/api/users/me");
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Authorization header is required.");
  });

  test("non-Bearer header -> 401", async () => {
    const res = await request(app)
      .get("/api/users/me")
      .set("Authorization", "Basic abc");
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid authorization format.");
  });

  test("rejected token -> 401", async () => {
    const res = await as("bad-token", request(app).get("/api/users/me"));
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid or expired authentication token.");
  });
});

describe("/api/users", () => {
  test("GET /me before the user exists -> 404", async () => {
    const res = await as("token-alice", request(app).get("/api/users/me"));
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("User not found.");
  });

  test("PUT /me before the user exists -> 404", async () => {
    const res = await as(
      "token-alice",
      request(app).put("/api/users/me").send({ displayName: "X" })
    );
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("User not found.");
  });

  test("POST / without any email -> 400", async () => {
    const res = await as(
      "token-no-email",
      request(app).post("/api/users").send({})
    );
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("User email is required.");
  });

  test("POST / creates the user (body wins over token, empty strings fall back, email lowercased) -> 201", async () => {
    const res = await as(
      "token-alice",
      request(app).post("/api/users").send({
        email: "Alice@Example.COM",
        displayName: "Alice Body",
        photoURL: "",
      })
    );

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("User created successfully.");
    expect(res.body.user).toMatchObject({
      firebaseUid: "uid-alice",
      email: "alice@example.com",
      displayName: "Alice Body",
      photoURL: "https://img.example.com/alice.png",
    });
    expect(res.body.user._id).toBeTruthy();
    expect(res.body.user.createdAt).toBeTruthy();
  });

  test("POST / again returns the existing user -> 200", async () => {
    const res = await as(
      "token-alice",
      request(app).post("/api/users").send({ displayName: "Ignored" })
    );

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("User already exists.");
    expect(res.body.user.displayName).toBe("Alice Body");
  });

  test("POST / falls back to token email, name and picture", async () => {
    testUsers.set("token-bob", {
      uid: "uid-bob",
      email: "bob@example.com",
      name: "Bob",
      picture: "https://img.example.com/bob.png",
    });

    const res = await as("token-bob", request(app).post("/api/users").send({}));

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({
      firebaseUid: "uid-bob",
      email: "bob@example.com",
      displayName: "Bob",
      photoURL: "https://img.example.com/bob.png",
    });
  });

  test("GET /me returns the user -> 200", async () => {
    const res = await as("token-alice", request(app).get("/api/users/me"));

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({
      firebaseUid: "uid-alice",
      email: "alice@example.com",
    });
  });

  test("PUT /me updates only the given fields -> 200", async () => {
    const res = await as(
      "token-alice",
      request(app)
        .put("/api/users/me")
        .send({ displayName: "Alice New", email: "hacker@example.com" })
    );

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("User updated successfully.");
    expect(res.body.user).toMatchObject({
      displayName: "Alice New",
      photoURL: "https://img.example.com/alice.png",
      email: "alice@example.com",
    });

    const photo = await as(
      "token-alice",
      request(app)
        .put("/api/users/me")
        .send({ photoURL: "https://img.example.com/new.png" })
    );
    expect(photo.body.user).toMatchObject({
      displayName: "Alice New",
      photoURL: "https://img.example.com/new.png",
    });
  });

  test("database error -> 500 with a fixed message and no raw error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const User = mongoose.model("User");
    vi.spyOn(User, "findOne").mockRejectedValueOnce(new Error("db down secret"));

    const res = await as("token-alice", request(app).get("/api/users/me"));

    expect(res.status).toBe(500);
    expect(res.body.message).toBe("Failed to get user.");
    expect(JSON.stringify(res.body)).not.toContain("db down secret");
  });

  test("database error on create -> 500 'Failed to create user.'", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    const User = mongoose.model("User");
    vi.spyOn(User, "findOne").mockRejectedValueOnce(new Error("db down"));

    const res = await as("token-alice", request(app).post("/api/users"));

    expect(res.status).toBe(500);
    expect(res.body.message).toBe("Failed to create user.");
  });

  test("database error on update -> 500 'Failed to update user.'", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const User = mongoose.model("User");
    vi.spyOn(User, "findOneAndUpdate").mockRejectedValueOnce(new Error("db down"));

    const res = await as(
      "token-alice",
      request(app).put("/api/users/me").send({ displayName: "Y" })
    );

    expect(res.status).toBe(500);
    expect(res.body.message).toBe("Failed to update user.");
  });
});
