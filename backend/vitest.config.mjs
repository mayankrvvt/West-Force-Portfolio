import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.{js,ts}"],
    environment: "node",
    // Fake values only. server.js skips dotenv when NODE_ENV=test,
    // so the real backend/.env is never loaded during tests.
    env: {
      NODE_ENV: "test",
      GEMINI_API_KEY: "test-gemini-key-not-real",
      DOCUMENT_ACCESS_SECRET: "test-document-secret",
      CLIENT_URL: "http://localhost:5173",
    },
    // mongodb-memory-server may download a mongod binary on first run.
    hookTimeout: 120000,
    testTimeout: 30000,
  },
});
