import { vi } from "vitest";

type TestUser = { uid: string; email?: string; email_verified?: boolean; [claim: string]: unknown };

// Tokens the fake Firebase accepts: token -> decoded user. Anything else is rejected.
export const testUsers = new Map<string, TestUser>();

// src/lib/clients/firebase.ts needs real credentials, so replace it before
// the app loads. vi.doMock (not hoisted) so callers can reset modules and reload.
function mockFirebase() {
  vi.doMock("../../src/lib/clients/firebase", () => ({
    firebaseApp: {},
    auth: {
      verifyIdToken: (token: string) => {
        const user = testUsers.get(token);
        return user ? Promise.resolve(user) : Promise.reject(new Error("Token rejected by test stub."));
      },
    },
  }));
}

export async function loadApp() {
  mockFirebase();
  const { createApp } = await import("../../src/app.js");
  return createApp();
}
