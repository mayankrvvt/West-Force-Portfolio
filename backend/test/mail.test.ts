import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// Resend is mocked: no test may ever reach the real API.
const resendMock = vi.hoisted(() => ({
  constructed: vi.fn(),
  send: vi.fn<(payload: { from: string; to: string; subject: string; html: string; text: string }) => Promise<unknown>>(),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: resendMock.send };
    constructor(key: string) {
      resendMock.constructed(key);
    }
  },
}));

import { logger } from "../src/lib/logger";
import { mailReaches, mailSettings, sendMail } from "../src/lib/mail";
import { jobDigestEmail, passwordResetEmail, verificationEmail, welcomeEmail } from "../src/lib/mail/templates";

const LINK = "https://westforce.example/auth/action?mode=resetPassword&oobCode=SECRET-CODE-123";
const KEY = "re_test_key_not_real";

const message = (to: string | string[]) => ({
  to,
  subject: "Reset your WestForce password",
  html: `<a href="${LINK}">Reset</a>`,
  text: `Reset: ${LINK}`,
});

/** Everything written to the logger during a test, as one string. */
function captureLogs() {
  const calls: unknown[] = [];
  for (const level of ["info", "warn", "error", "debug"] as const) {
    vi.spyOn(logger, level).mockImplementation((...args: unknown[]) => {
      calls.push(args);
    });
  }
  return () => JSON.stringify(calls);
}

/** Live settings outside the test env. */
function goLive(extra: Record<string, string> = {}) {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("MAIL_MODE", "live");
  vi.stubEnv("RESEND_API_KEY", KEY);
  vi.stubEnv("MAIL_FROM", "WestForce <hello@westforce.example>");
  vi.stubEnv("MAIL_ALLOWLIST", "");
  for (const [name, value] of Object.entries(extra)) vi.stubEnv(name, value);
}

beforeEach(() => {
  resendMock.constructed.mockClear();
  resendMock.send.mockReset();
  resendMock.send.mockResolvedValue({ data: { id: "email_1" }, error: null, headers: null });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("sendMail safety", () => {
  test("NODE_ENV=test never calls Resend, even with live settings", async () => {
    vi.stubEnv("MAIL_MODE", "live");
    vi.stubEnv("RESEND_API_KEY", KEY);
    vi.stubEnv("MAIL_FROM", "WestForce <hello@westforce.example>");
    const logs = captureLogs();

    const result = await sendMail(message("person@example.com"));

    expect(result).toEqual({ mode: "pretend", sent: 1, skipped: 0 });
    expect(resendMock.constructed).not.toHaveBeenCalled();
    expect(resendMock.send).not.toHaveBeenCalled();
    expect(logs()).toContain("Reset your WestForce password");
  });

  test("pretend unless MAIL_MODE=live with a key and a sender", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(mailSettings().mode).toBe("pretend");

    vi.stubEnv("MAIL_MODE", "live");
    vi.stubEnv("RESEND_API_KEY", KEY);
    vi.stubEnv("MAIL_FROM", "");
    captureLogs();
    expect(mailSettings().mode).toBe("pretend");

    vi.stubEnv("MAIL_FROM", "WestForce <hello@westforce.example>");
    expect(mailSettings().mode).toBe("live");
  });

  test("mailReaches: false unless live, and false for addresses off the allowlist", () => {
    expect(mailReaches("a@example.com")).toBe(false);
    goLive();
    expect(mailReaches("a@example.com")).toBe(true);
    goLive({ MAIL_ALLOWLIST: "a@example.com" });
    expect(mailReaches(" A@Example.com")).toBe(true);
    expect(mailReaches("b@example.com")).toBe(false);
  });

  test("live mode sends one email per address, never everyone on one To line", async () => {
    goLive();
    captureLogs();

    const result = await sendMail(message(["a@example.com", "B@Example.com", "a@example.com"]));

    expect(result).toEqual({ mode: "live", sent: 2, skipped: 0 });
    expect(resendMock.send).toHaveBeenCalledTimes(2);
    expect(resendMock.send.mock.calls.map(([payload]) => payload.to)).toEqual(["a@example.com", "b@example.com"]);
    expect(resendMock.send.mock.calls[0]?.[0]).toMatchObject({
      from: "WestForce <hello@westforce.example>",
      subject: "Reset your WestForce password",
    });
  });

  test("MAIL_ALLOWLIST: only listed addresses get mail, the rest are skipped and counted", async () => {
    goLive({ MAIL_ALLOWLIST: " Allowed@example.com , other@example.com" });
    const logs = captureLogs();

    const result = await sendMail(message(["allowed@example.com", "blocked@example.com", "also.blocked@example.com"]));

    expect(result).toEqual({ mode: "live", sent: 1, skipped: 2 });
    expect(resendMock.send).toHaveBeenCalledTimes(1);
    expect(resendMock.send.mock.calls[0]?.[0].to).toBe("allowed@example.com");
    expect(logs()).not.toContain("blocked@example.com");
  });

  test("no address on the allowlist sends nothing", async () => {
    goLive({ MAIL_ALLOWLIST: "someone.else@example.com" });
    captureLogs();

    const result = await sendMail(message("person@example.com"));

    expect(result).toEqual({ mode: "live", sent: 0, skipped: 1 });
    expect(resendMock.send).not.toHaveBeenCalled();
  });

  test("logs never hold the link, code, key or address, in any mode", async () => {
    const logs = captureLogs();

    await sendMail(message("person@example.com"));
    goLive();
    await sendMail(message("person@example.com"));
    resendMock.send.mockResolvedValueOnce({
      data: null,
      error: { name: "validation_error", message: "bad", statusCode: 422 },
      headers: null,
    });
    await expect(sendMail(message("person@example.com"))).rejects.toThrow("Mail send failed (validation_error).");

    const written = logs();
    expect(written).not.toContain("SECRET-CODE-123");
    expect(written).not.toContain("auth/action");
    expect(written).not.toContain(KEY);
    expect(written).not.toContain("person@example.com");
  });
});

describe("templates", () => {
  const all = {
    verification: verificationEmail("https://westforce.example/auth/action?mode=verifyEmail&oobCode=abc", "Emma Tremblay"),
    reset: passwordResetEmail("https://westforce.example/auth/action?mode=resetPassword&oobCode=abc"),
    welcome: welcomeEmail(""),
    digest: jobDigestEmail([
      { title: "Personal support worker", company: "Peel Home Care", location: "Brampton, ON", url: "https://jobs.example/1" },
      { title: "Cook", company: null, location: undefined, url: "" },
    ]),
  };

  test.each(Object.entries(all))("%s has a subject, a button link, a text version and no undefined or NaN", (_name, email) => {
    expect(email.subject).toBeTruthy();
    expect(email.html).toMatch(/<a href="https?:\/\/[^"]+"[^>]*>[^<]+<\/a>\s*<\/td><\/tr><\/table>/);
    expect(email.html).toContain('alt="WestForce logo"');
    expect(email.html).toMatch(/src="https?:\/\/[^"]+\/favicon\.png" width="32" height="32"/);
    expect(email.text.length).toBeGreaterThan(50);
    for (const part of [email.subject, email.html, email.text]) {
      expect(part).not.toMatch(/undefined|NaN|\[object Object\]/);
    }
  });

  test("action links appear as the button href and as plain copy and paste text", () => {
    const link = "https://westforce.example/auth/action?mode=resetPassword&oobCode=abc";
    const email = passwordResetEmail(link);
    const escaped = link.replace(/&/g, "&amp;");

    expect(email.html.split(`href="${escaped}"`).length - 1).toBe(2);
    expect(email.text).toContain(link);
    expect(email.text).toContain("expires in 1 hour");
  });

  test("only the job digest links to Settings", () => {
    expect(all.digest.html).toContain("/dashboard/settings#job-preferences");
    expect(all.digest.text).toContain("Change these emails in Settings");
    expect(all.reset.html).not.toContain("dashboard/settings");
    expect(all.welcome.html).not.toContain("dashboard/settings");
  });

  test("user text is escaped", () => {
    const email = jobDigestEmail([{ title: "<script>x</script>", company: "A & B", location: "", url: "javascript:alert(1)" }]);

    expect(email.html).not.toContain("<script>x");
    expect(email.html).toContain("A &amp; B");
    expect(email.html).not.toContain("javascript:");
  });
});
