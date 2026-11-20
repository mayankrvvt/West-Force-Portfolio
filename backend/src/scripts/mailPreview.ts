/*
 * Write every email template with sample data to backend/tmp/mail-preview/
 * so you can open them in a browser: npm run mail:preview
 *
 * It only renders HTML and text files. It never sends mail and needs no
 * database or .env. Set SITE_URL to show the logo from your live site.
 */
import fs from "node:fs";
import path from "node:path";
import {
  jobDigestEmail,
  passwordResetEmail,
  verificationEmail,
  welcomeEmail,
} from "../lib/mail/templates";
import { siteUrl } from "../lib/mail/layout";

const outDir = path.resolve(__dirname, "../../tmp/mail-preview");
const sampleLink = (mode: string) => `${siteUrl()}/auth/action?mode=${mode}&oobCode=SAMPLE-CODE-NOT-REAL`;

const samples = {
  verification: verificationEmail(sampleLink("verifyEmail"), "Emma Tremblay"),
  "password-reset": passwordResetEmail(sampleLink("resetPassword")),
  welcome: welcomeEmail("Emma Tremblay"),
  "job-digest": jobDigestEmail(
    [
      { title: "Personal support worker", company: "Peel Home Care", location: "Brampton, ON", url: "https://example.com/jobs/1" },
      { title: "Home support worker", company: "Maple Community Health", location: "Mississauga, ON", url: "https://example.com/jobs/2" },
      { title: "Personal support worker, nights", company: "", location: "Toronto, ON", url: "" },
    ],
    "Emma Tremblay"
  ),
};

fs.mkdirSync(outDir, { recursive: true });

for (const [name, email] of Object.entries(samples)) {
  fs.writeFileSync(path.join(outDir, `${name}.html`), email.html);
  fs.writeFileSync(path.join(outDir, `${name}.txt`), `Subject: ${email.subject}\n\n${email.text}\n`);
}

process.stdout.write(`Wrote ${Object.keys(samples).length} previews to ${outDir}. Nothing was sent.\n`);
