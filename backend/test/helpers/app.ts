import { vi } from "vitest";

type TestUser = { uid: string; email?: string; email_verified?: boolean; [claim: string]: unknown };

// Tokens the fake Firebase accepts: token -> decoded user. Anything else is rejected.
export const testUsers = new Map<string, TestUser>();

// Other Firebase Admin auth calls. Tests swap these with vi.fn() as needed.
export const authStub = {
  generatePasswordResetLink: (_email: string, _settings?: unknown): Promise<string> =>
    Promise.reject(Object.assign(new Error("not stubbed"), { code: "auth/email-not-found" })),
  generateEmailVerificationLink: (_email: string, _settings?: unknown): Promise<string> =>
    Promise.reject(new Error("not stubbed")),
  getUser: (uid: string): Promise<{ uid: string; email?: string; emailVerified: boolean }> =>
    Promise.resolve({ uid, emailVerified: false }),
};

// src/lib/clients/firebase.ts needs real credentials, so replace it before
// the app loads. vi.doMock (not hoisted) so callers can reset modules and reload.
function mockFirebase() {
  vi.doMock("../../src/lib/clients/firebase", () => ({
    firebaseApp: {},
    auth: {
      generatePasswordResetLink: (email: string, settings?: unknown) => authStub.generatePasswordResetLink(email, settings),
      generateEmailVerificationLink: (email: string, settings?: unknown) => authStub.generateEmailVerificationLink(email, settings),
      getUser: (uid: string) => authStub.getUser(uid),
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
