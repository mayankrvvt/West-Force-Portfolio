/*
 * Every email WestForce sends, built on the one layout. No config or
 * database imports, so `npm run mail:preview` can render them anywhere.
 */
import { renderEmail, siteUrl, type RenderedEmail } from "./layout";

const ACCOUNT_REASON = "You got this email because of an action on your WestForce account.";

const hello = (name: string | undefined, rest: string) => {
  const first = name?.trim().split(/\s+/)[0];
  return first ? `Hi ${first}, ${rest}` : `${rest.charAt(0).toUpperCase()}${rest.slice(1)}`;
};

export function verificationEmail(link: string, name?: string): RenderedEmail {
  return renderEmail({
    subject: "Verify your email for WestForce",
    preheader: "One click to confirm this is your email address.",
    heading: hello(name, "please verify your email"),
    blocks: [
      { type: "text", text: "Confirm this is your email address so you can use every part of your WestForce account." },
      { type: "button", label: "Verify my email", url: link },
      { type: "note", text: "The link works once. If you did not make a WestForce account, you can ignore this email." },
    ],
    reason: ACCOUNT_REASON,
  });
}

export function passwordResetEmail(link: string): RenderedEmail {
  return renderEmail({
    subject: "Reset your WestForce password",
    preheader: "Choose a new password. The link expires in 1 hour.",
    heading: "Reset your password",
    blocks: [
      { type: "text", text: "We got a request to reset the password for your WestForce account. Use the button below to choose a new one." },
      { type: "button", label: "Choose a new password", url: link },
      { type: "note", text: "This link expires in 1 hour and works once. If you did not ask for this, ignore this email and your password stays the same." },
    ],
    reason: ACCOUNT_REASON,
  });
}

export function welcomeEmail(name?: string): RenderedEmail {
  const site = siteUrl();
  return renderEmail({
    subject: "Welcome to WestForce",
    preheader: "Your email is verified. Here are three things to do next.",
    heading: hello(name, "welcome to WestForce"),
    blocks: [
      { type: "text", text: "Your email is verified. Here are three quick steps to get the most from your portfolio." },
      {
        type: "steps",
        items: [
          { title: "Finish your portfolio", text: "Add your work history, skills and certificates so employers see the full picture." },
          { title: "Add an intro video", text: "A short video helps employers put a face and voice to your resume." },
          { title: "Check jobs for you", text: "We match jobs in Canada to your job preferences and resume." },
        ],
      },
      { type: "button", label: "Go to my dashboard", url: `${site}/dashboard` },
    ],
    reason: "You got this email because you verified the email on your WestForce account.",
  });
}

export type DigestJob = {
  title: string;
  company?: string | null;
  location?: string | null;
  url?: string | null;
};

export function jobDigestEmail(jobs: DigestJob[], name?: string): RenderedEmail {
  const site = siteUrl();
  const count = jobs.length;
  const noun = count === 1 ? "job" : "jobs";

  return renderEmail({
    subject: `${count} new ${noun} for you this week`,
    preheader: `${count} new ${noun} in Canada that match your job preferences.`,
    heading: hello(name, `here are ${count} new ${noun} for you`),
    blocks: [
      { type: "text", text: "These were posted in the last 7 days and match your job preferences and resume." },
      {
        type: "items",
        items: jobs.map((job) => ({
          title: job.title,
          url: job.url || `${site}/dashboard/jobs`,
          lines: [[job.company, job.location].filter(Boolean).join(", ")],
        })),
      },
      { type: "button", label: "See all jobs for you", url: `${site}/dashboard/jobs` },
    ],
    reason: "You got this email because you asked for new jobs each week.",
    settingsUrl: `${site}/dashboard/settings#job-preferences`,
  });
}
