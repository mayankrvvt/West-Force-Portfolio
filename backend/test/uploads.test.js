import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import request from "supertest";
import { loadApp, testUsers } from "./helpers/app";
import { startMongo, stopMongo } from "./helpers/mongo";
import {
  cloudinaryFake,
  mockUploadClients,
  resetUploadFakes,
  supabaseFake,
} from "./helpers/uploadClients.js";

// Characterization tests: pin the current /api/uploads behaviour.
// Cloudinary and Supabase are fakes; nothing leaves the process.
// Error bodies use toMatchObject: the module version also adds requestId.
process.env.SUPABASE_URL = "https://abcdproject.supabase.co";
process.env.SUPABASE_SECRET_KEY = "fake-supabase-secret";

const OWNER = { uid: "uid-upload-owner", email: "owner@example.com" };
const STRANGER = { uid: "uid-upload-stranger", email: "stranger@example.com" };

let app;
let mongoose;
let ownerId;

async function load() {
  mockUploadClients();
  return loadApp();
}

beforeAll(async () => {
  testUsers.set("token-owner", OWNER);
  testUsers.set("token-stranger", STRANGER);
  mongoose = await startMongo();
  app = await load();

  const users = mongoose.connection.collection("users");
  const inserted = await users.insertOne({
    firebaseUid: OWNER.uid,
    email: OWNER.email,
  });
  ownerId = inserted.insertedId;
});

afterAll(async () => {
  testUsers.clear();
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SECRET_KEY;
  await stopMongo();
});

beforeEach(() => {
  resetUploadFakes();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

const as = (token, req) => req.set("Authorization", `Bearer ${token}`);
const PNG = Buffer.from("fake-png-bytes");

describe("auth", () => {
  test.each([
    ["post", "/api/uploads"],
    ["post", "/api/uploads/video"],
    ["post", "/api/uploads/video-signature"],
    ["post", "/api/uploads/video/init"],
    ["post", "/api/uploads/video/complete"],
  ])("%s %s without a token -> 401", async (method, url) => {
    const res = await request(app)[method](url);
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Authorization header is required.");
  });

  test("a rejected token -> 401", async () => {
    const res = await as("bad", request(app).post("/api/uploads"));
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid or expired authentication token.");
  });
});

describe("GET /api/uploads/video/config", () => {
  test("Supabase configured -> resumable", async () => {
    const res = await request(app).get("/api/uploads/video/config");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      enabled: true,
      mode: "resumable",
      message: "Resumable video uploads are enabled.",
    });
  });

  test("Supabase not configured -> direct", async () => {
    const url = process.env.SUPABASE_URL;
    let res;
    try {
      delete process.env.SUPABASE_URL;
      // Fresh copy of the app that reads the env again (models recompiled).
      vi.resetModules();
      mongoose.deleteModel(/.+/);
      const plainApp = await load();
      res = await request(plainApp).get("/api/uploads/video/config");
    } finally {
      process.env.SUPABASE_URL = url;
    }

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      enabled: false,
      mode: "direct",
      message:
        "Supabase is not configured; direct Cloudinary uploads will be used.",
    });
  });
});

describe("POST /api/uploads (documents/images)", () => {
  test("no file -> 400", async () => {
    const res = await as("token-owner", request(app).post("/api/uploads"));
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ success: false, message: "No file was uploaded." });
  });

  test("image -> 200 with the file details, public upload", async () => {
    const res = await as(
      "token-owner",
      request(app)
        .post("/api/uploads")
        .attach("file", PNG, { filename: "photo.png", contentType: "image/png" })
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: "File uploaded successfully.",
      file: {
        name: "photo.png",
        url: "https://res.cloudinary.example/fake-id",
        publicId: "westforce/portfolios/fake-id",
        resourceType: "image",
        format: "png",
        mimeType: "image/png",
        size: 1234,
        protected: false,
        isVideo: false,
        storage: "cloudinary",
      },
    });
    expect(cloudinaryFake.uploadOptions).toEqual([
      { folder: "westforce/portfolios", resource_type: "image", type: "upload" },
    ]);
  });

  test('protected="true" PDF -> raw + authenticated upload', async () => {
    const res = await as(
      "token-owner",
      request(app)
        .post("/api/uploads")
        .field("protected", "true")
        .attach("file", Buffer.from("%PDF"), {
          filename: "cv.pdf",
          contentType: "application/pdf",
        })
    );

    expect(res.status).toBe(200);
    expect(res.body.file.protected).toBe(true);
    expect(res.body.file.mimeType).toBe("application/pdf");
    expect(cloudinaryFake.uploadOptions).toEqual([
      { folder: "westforce/portfolios", resource_type: "raw", type: "authenticated" },
    ]);
  });

  test("video sent as application/octet-stream (.mp4) -> 400, points to /api/uploads/video", async () => {
    const res = await as(
      "token-owner",
      request(app)
        .post("/api/uploads")
        .attach("file", Buffer.from("fake"), {
          filename: "clip.mp4",
          contentType: "application/octet-stream",
        })
    );

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Upload videos to /api/uploads/video.");
    expect(cloudinaryFake.uploadOptions).toEqual([]);
  });

  test("video file -> 400, points to /api/uploads/video", async () => {
    const res = await as(
      "token-owner",
      request(app)
        .post("/api/uploads")
        .attach("file", Buffer.from("vid"), { filename: "a.mp4", contentType: "video/mp4" })
    );
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      success: false,
      message: "Upload videos to /api/uploads/video.",
    });
    expect(cloudinaryFake.uploadOptions).toHaveLength(0);
  });

  test("disallowed type -> 400 with the allowed list", async () => {
    const res = await as(
      "token-owner",
      request(app)
        .post("/api/uploads")
        .attach("file", Buffer.from("hi"), { filename: "a.txt", contentType: "text/plain" })
    );
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      success: false,
      message:
        "Only PDF, DOC, DOCX, JPG, PNG, WebP, MP4, MOV, M4, M4V and WebM files are allowed.",
    });
  });

  test("unexpected multipart field -> 400 (multer error)", async () => {
    const res = await as(
      "token-owner",
      request(app)
        .post("/api/uploads")
        .attach("other", PNG, { filename: "photo.png", contentType: "image/png" })
    );
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ success: false, message: "Unexpected file field" });
  });

  test("Cloudinary error keeps its http_code and message", async () => {
    cloudinaryFake.uploadResult.mockReturnValueOnce({
      error: Object.assign(new Error("Invalid image file"), { http_code: 400 }),
      result: undefined,
    });

    const res = await as(
      "token-owner",
      request(app)
        .post("/api/uploads")
        .attach("file", PNG, { filename: "photo.png", contentType: "image/png" })
    );
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ success: false, message: "Invalid image file" });
  });

  test("incomplete Cloudinary result -> 502", async () => {
    cloudinaryFake.uploadResult.mockReturnValueOnce({ error: null, result: {} });

    const res = await as(
      "token-owner",
      request(app)
        .post("/api/uploads")
        .attach("file", PNG, { filename: "photo.png", contentType: "image/png" })
    );
    expect(res.status).toBe(502);
    expect(res.body).toMatchObject({
      success: false,
      message: "Cloudinary returned an incomplete upload result.",
    });
  });

  test("file over 50 MB -> 413", async () => {
    const big = Buffer.alloc(50 * 1024 * 1024 + 1);
    const res = await as(
      "token-owner",
      request(app)
        .post("/api/uploads")
        .attach("file", big, { filename: "big.png", contentType: "image/png" })
    );
    expect(res.status).toBe(413);
    expect(res.body).toMatchObject({
      success: false,
      message: "File is too large. Maximum size is 50 MB.",
    });
  });
});

describe("POST /api/uploads/video (direct Cloudinary)", () => {
  test("no file -> 400", async () => {
    const res = await as("token-owner", request(app).post("/api/uploads/video"));
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ success: false, message: "No video was uploaded." });
  });

  test("video over 50 MB -> 413 with the real 50 MB limit in the message", async () => {
    const big = Buffer.alloc(50 * 1024 * 1024 + 1);
    const res = await as(
      "token-owner",
      request(app)
        .post("/api/uploads/video")
        .attach("file", big, { filename: "big.mp4", contentType: "video/mp4" })
    );
    expect(res.status).toBe(413);
    expect(res.body).toMatchObject({
      success: false,
      message: "Video must be smaller than 50 MB.",
    });
  });

  test("non-video -> 400", async () => {
    const res = await as(
      "token-owner",
      request(app)
        .post("/api/uploads/video")
        .attach("file", PNG, { filename: "photo.png", contentType: "image/png" })
    );
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      success: false,
      message: "Only supported video files can be uploaded.",
    });
  });

  test("video -> 201 stored on Cloudinary as a video", async () => {
    cloudinaryFake.uploadResult.mockReturnValueOnce({
      error: null,
      result: {
        public_id: "westforce/portfolios/vid",
        secure_url: "https://res.cloudinary.example/vid",
        resource_type: "video",
        format: "mp4",
        bytes: 99,
      },
    });

    const res = await as(
      "token-owner",
      request(app)
        .post("/api/uploads/video")
        .attach("file", Buffer.from("vid"), { filename: "intro.mp4", contentType: "video/mp4" })
    );

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      success: true,
      message: "Video uploaded successfully.",
      file: {
        name: "intro.mp4",
        url: "https://res.cloudinary.example/vid",
        publicId: "westforce/portfolios/vid",
        resourceType: "video",
        format: "mp4",
        size: 99,
        storage: "cloudinary",
      },
    });
    expect(cloudinaryFake.uploadOptions).toEqual([
      { folder: "westforce/portfolios", resource_type: "video", type: "upload" },
    ]);
  });

  test("Cloudinary failure -> its status and message", async () => {
    cloudinaryFake.uploadResult.mockReturnValueOnce({
      error: Object.assign(new Error("Video too long"), { http_code: 420 }),
      result: undefined,
    });

    const res = await as(
      "token-owner",
      request(app)
        .post("/api/uploads/video")
        .attach("file", Buffer.from("vid"), { filename: "intro.mov", contentType: "video/quicktime" })
    );
    expect(res.status).toBe(420);
    expect(res.body).toMatchObject({ success: false, message: "Video too long" });
  });
});

describe("POST /api/uploads/video-signature", () => {
  const sign = (body, token = "token-owner") =>
    as(token, request(app).post("/api/uploads/video-signature").send(body));

  test.each([
    [{}, 400, "Video filename is required."],
    [{ filename: "a.mp4", size: 0 }, 400, "A valid video size is required."],
    [{ filename: "a.mp4", size: "abc" }, 400, "A valid video size is required."],
    [{ filename: "a.mp4", size: 100 * 1024 * 1024 + 1 }, 413, "Video must be smaller than 100 MB."],
    [
      { filename: "a.txt", contentType: "text/plain", size: 10 },
      400,
      "Only MP4, MOV, M4, M4V, WebM, and AVI videos are allowed.",
    ],
  ])("invalid body %j -> %i", async (body, status, message) => {
    const res = await sign(body);
    expect(res.status).toBe(status);
    expect(res.body).toMatchObject({ success: false, message });
  });

  test("signed-in user without a Mongo user -> 404", async () => {
    const res = await sign({ filename: "a.mp4", size: 10 }, "token-stranger");
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false, message: "Authenticated user not found." });
  });

  test("someone else's portfolio -> 403", async () => {
    const other = await mongoose.connection.collection("portfolios").insertOne({
      userId: new mongoose.Types.ObjectId(),
      slug: "not-mine",
    });

    const res = await sign({ filename: "a.mp4", size: 10, portfolioId: String(other.insertedId) });
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({
      success: false,
      message: "You can only upload a video to your own portfolio.",
    });
  });

  test("own portfolio -> 200 with a signature", async () => {
    const mine = await mongoose.connection.collection("portfolios").insertOne({
      userId: ownerId,
      slug: "mine",
    });

    const res = await sign({
      filename: "a.mp4",
      contentType: "video/mp4",
      size: 10,
      portfolioId: String(mine.insertedId),
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: "Cloudinary upload signature ready.",
      apiKey: "fake-api-key",
      cloudName: "fake-cloud",
      signature: "fake-signature",
      timestamp: expect.any(Number),
      uploadUrl: "https://api.cloudinary.com/v1_1/fake-cloud/auto/upload",
      params: {
        timestamp: res.body.timestamp,
        folder: "westforce/portfolios",
        type: "upload",
        overwrite: false,
      },
      resourceType: "video",
      maxFileSize: 100 * 1024 * 1024,
    });
    expect(cloudinaryFake.sign).toHaveBeenCalledWith(res.body.params, "fake-api-secret");
  });

  test("Cloudinary not configured -> 500", async () => {
    cloudinaryFake.config.mockReturnValueOnce({});

    const res = await sign({ filename: "a.mp4", size: 10 });
    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({
      success: false,
      message: "Cloudinary is not configured on the server.",
    });
  });
});

describe("POST /api/uploads/video/init (Supabase TUS)", () => {
  const init = (body) =>
    as("token-owner", request(app).post("/api/uploads/video/init").send(body));

  test.each([
    [{}, 400, "Video filename is required."],
    [{ filename: "a.mp4", contentType: "text/plain", size: 1 }, 400, "Only MP4, MOV and WebM videos are allowed."],
    [{ filename: "a.mp4", contentType: "video/mp4", size: -1 }, 400, "A valid video size is required."],
    [{ filename: "a.mp4", contentType: "video/mp4", size: 50 * 1024 * 1024 + 1 }, 413, "Video must be smaller than 50 MB."],
  ])("invalid body %j -> %i", async (body, status, message) => {
    const res = await init(body);
    expect(res.status).toBe(status);
    expect(res.body).toMatchObject({ success: false, message });
    expect(supabaseFake.createSignedUploadUrl).not.toHaveBeenCalled();
  });

  test("valid -> 200 with token, path and TUS endpoint", async () => {
    const res = await init({ filename: "My Clip!.mp4", contentType: "video/mp4", size: 2048 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      bucket: "westforce-videos",
      path: expect.stringMatching(/^videos\/\d{4}\/\d{2}\/[0-9a-f]{32}-My_Clip_\.mp4$/),
      token: "fake-upload-token",
      publicUrl: `https://fake.supabase.example/public/${res.body.path}`,
      tusEndpoint: "https://abcdproject.storage.supabase.co/storage/v1/upload/resumable",
      resourceType: "video",
      format: "mp4",
      size: 2048,
    });
    expect(supabaseFake.createSignedUploadUrl).toHaveBeenCalledWith(res.body.path, {
      upsert: false,
    });
    expect(supabaseFake.buckets.every((b) => b === "westforce-videos")).toBe(true);
  });

  test("Supabase error -> 500 with its message", async () => {
    supabaseFake.createSignedUploadUrl.mockResolvedValueOnce({
      data: null,
      error: { message: "Bucket not found" },
    });
    const res = await init({ filename: "a.mp4", contentType: "video/mp4", size: 10 });
    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({ success: false, message: "Bucket not found" });
  });

  test("no token from Supabase -> 502", async () => {
    supabaseFake.createSignedUploadUrl.mockResolvedValueOnce({ data: {}, error: null });
    const res = await init({ filename: "a.mp4", contentType: "video/mp4", size: 10 });
    expect(res.status).toBe(502);
    expect(res.body).toMatchObject({
      success: false,
      message: "Supabase did not return a signed upload token.",
    });
  });
});

describe("POST /api/uploads/video/complete", () => {
  const complete = (body) =>
    as("token-owner", request(app).post("/api/uploads/video/complete").send(body));

  test.each([
    [{}, "Video storage path is required."],
    [{ path: "../secrets/x.mp4" }, "Invalid video storage path."],
  ])("invalid body %j -> 400", async (body, message) => {
    const res = await complete(body);
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ success: false, message });
  });

  test("no public URL -> 502", async () => {
    supabaseFake.getPublicUrl.mockReturnValueOnce({ data: {} });
    const res = await complete({ path: "videos/2026/01/x.mp4" });
    expect(res.status).toBe(502);
    expect(res.body).toMatchObject({
      success: false,
      message: "Video uploaded, but Supabase did not return a public URL.",
    });
  });

  test("valid -> 200 with the Supabase file", async () => {
    const res = await complete({ path: "videos/2026/01/x.webm", filename: "intro.webm", size: 77 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: "Video uploaded successfully.",
      file: {
        name: "intro.webm",
        url: "https://fake.supabase.example/public/videos/2026/01/x.webm",
        publicId: "videos/2026/01/x.webm",
        resourceType: "video",
        format: "webm",
        size: 77,
        protected: false,
        isVideo: true,
        storage: "supabase",
      },
    });
  });

  test("defaults: filename introduction-video, bad size -> 0", async () => {
    const res = await complete({ path: "videos/x", size: "nope" });
    expect(res.status).toBe(200);
    expect(res.body.file).toMatchObject({ name: "introduction-video", format: "", size: 0 });
  });
});
