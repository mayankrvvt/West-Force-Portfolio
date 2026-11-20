import { createRequire } from "node:module";
import { vi } from "vitest";

// Real Stripe webhooks helper (pure crypto, no network) so signatures are real.
// Loaded with Node's own require, so vi.doMock("stripe") below does not touch it.
const require = createRequire(import.meta.url);
const RealStripe = require("stripe");
export const realWebhooks = new RealStripe("sk_test_fake_for_signatures").webhooks;

export const stripeCalls = {
  create: vi.fn(),
  retrieve: vi.fn(),
  constructorArgs: [],
};

function FakeStripe(...args) {
  stripeCalls.constructorArgs.push(args);
  return {
    checkout: {
      sessions: {
        create: stripeCalls.create,
        retrieve: stripeCalls.retrieve,
      },
    },
    webhooks: realWebhooks,
  };
}

// Replace the "stripe" package before the app loads. No real Stripe calls.
export function mockStripe() {
  vi.doMock("stripe", () => ({ default: FakeStripe }));
}
