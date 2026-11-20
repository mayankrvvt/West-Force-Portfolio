/*
 * The one branded layout for every WestForce email. No imports from config,
 * so `npm run mail:preview` can render it without a database or .env.
 */

/**
 * Public site address with no trailing slash, for links and the logo.
 * SITE_URL, else the first CLIENT_URL origin, else the Vite dev server.
 * Read at call time (the server loads .env before any mail is built).
 */
export function siteUrl(env: NodeJS.ProcessEnv = process.env): string {
  const fromClient = (env.CLIENT_URL ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .find(Boolean);
  return (env.SITE_URL?.trim() || fromClient || "http://localhost:5173").replace(/\/+$/, "");
}

/** Pieces of an email body, rendered to both HTML and plain text. */
export type EmailBlock =
  | { type: "text"; text: string }
  /** One clear button, with the plain link under it for copy and paste. */
  | { type: "button"; label: string; url: string }
  | { type: "note"; text: string }
  | { type: "steps"; items: { title: string; text: string }[] }
  | { type: "items"; items: { title: string; url: string; lines: string[] }[] };

export type EmailContent = {
  subject: string;
  /** Short line some inboxes show after the subject. */
  preheader: string;
  heading: string;
  blocks: EmailBlock[];
  /** Why they got this email. */
  reason: string;
  /** Adds "Change these emails in Settings" to the footer (job digest only). */
  settingsUrl?: string;
};

export type RenderedEmail = { subject: string; html: string; text: string };

const NAVY = "#0D2B45";
const LAKE = "#2F6F9F";
const INK = "#1B2733";
const MUTED = "#5B6875";
const FROST = "#F2F6FA";
const LINE = "#DCE4EB";
const FONT = "Manrope, Arial, Helvetica, sans-serif";

export const escapeHtml = (text: string) =>
  String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** Only http(s) links go into an href. */
function safeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : "#";
  } catch {
    return "#";
  }
}

const paragraph = (text: string, size: 16 | 14, color: string) =>
  `<p class="wf-${size === 16 ? "text" : "muted"}" style="margin:0 0 16px;font-family:${FONT};font-size:${size}px;line-height:${size === 16 ? 24 : 21}px;color:${color};">${escapeHtml(text)}</p>`;

function blockHtml(block: EmailBlock): string {
  switch (block.type) {
    case "text":
      return paragraph(block.text, 16, INK);
    case "note":
      return paragraph(block.text, 14, MUTED);
    case "button": {
      const href = escapeHtml(safeUrl(block.url));
      // Bulletproof button: the table cell carries the colour and height, so
      // Outlook still shows a 44px tall button.
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 16px;">
<tr><td align="center" height="44" bgcolor="${LAKE}" style="height:44px;border-radius:4px;background:${LAKE};">
<a href="${href}" target="_blank" style="display:inline-block;padding:0 28px;font-family:${FONT};font-size:16px;font-weight:700;line-height:44px;color:#FFFFFF;text-decoration:none;border-radius:4px;">${escapeHtml(block.label)}</a>
</td></tr></table>
<p class="wf-muted" style="margin:0 0 20px;font-family:${FONT};font-size:13px;line-height:19px;color:${MUTED};">Button not working? Copy this link into your browser:<br><a href="${href}" style="color:${LAKE};word-break:break-all;">${escapeHtml(block.url)}</a></p>`;
    }
    case "steps":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;">${block.items
        .map(
          (item, index) => `<tr>
<td valign="top" width="36" style="padding:0 0 14px;"><div style="width:26px;height:26px;border-radius:13px;background:${NAVY};color:#FFFFFF;font-family:${FONT};font-size:14px;font-weight:700;line-height:26px;text-align:center;">${index + 1}</div></td>
<td valign="top" style="padding:2px 0 14px;font-family:${FONT};"><div class="wf-text" style="font-size:16px;font-weight:700;line-height:22px;color:${INK};">${escapeHtml(item.title)}</div><div class="wf-muted" style="font-size:14px;line-height:21px;color:${MUTED};">${escapeHtml(item.text)}</div></td>
</tr>`
        )
        .join("")}</table>`;
    case "items":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;border-collapse:collapse;">${block.items
        .map(
          (item) => `<tr><td class="wf-line" style="padding:14px 0;border-top:1px solid ${LINE};">
<a href="${escapeHtml(safeUrl(item.url))}" target="_blank" class="wf-link" style="font-family:${FONT};font-size:16px;font-weight:700;line-height:22px;color:${LAKE};text-decoration:none;">${escapeHtml(item.title)}</a>${item.lines
            .filter(Boolean)
            .map(
              (line) =>
                `<div class="wf-muted" style="font-family:${FONT};font-size:14px;line-height:20px;color:${MUTED};">${escapeHtml(line)}</div>`
            )
            .join("")}
</td></tr>`
        )
        .join("")}</table>`;
  }
}

function blockText(block: EmailBlock): string {
  switch (block.type) {
    case "text":
    case "note":
      return block.text;
    case "button":
      return `${block.label}:\n${block.url}`;
    case "steps":
      return block.items.map((item, index) => `${index + 1}. ${item.title}\n   ${item.text}`).join("\n");
    case "items":
      return block.items
        .map((item) => [item.title, ...item.lines.filter(Boolean), item.url].join("\n"))
        .join("\n\n");
  }
}

// Clients that read <style> (Apple Mail, iOS, some Outlook apps) get a dark
// card in dark mode. The others keep the light colours set inline.
const DARK_STYLES = `<style>
:root { color-scheme: light dark; supported-color-schemes: light dark; }
@media (prefers-color-scheme: dark) {
  .wf-body, .wf-frost { background:#0B1620 !important; }
  .wf-card { background:#13212E !important; border-color:#24384A !important; }
  .wf-heading { color:#E8F0F6 !important; }
  .wf-text { color:#D7E1EA !important; }
  .wf-muted { color:#A9B7C4 !important; }
  .wf-line { border-color:#24384A !important; }
  .wf-link { color:#8CC0E8 !important; }
}
</style>`;

/**
 * Navy header with the WF logo on a white tile (so it never sits on white or
 * vanishes in dark mode), a white card on frost, and a small footer. 600px
 * max table with inline styles so it holds up in Gmail and Outlook.
 */
export function renderEmail(content: EmailContent): RenderedEmail {
  const site = siteUrl();
  const logo = `${site}/favicon.png`;

  const footerLinks = content.settingsUrl
    ? `<br><a href="${escapeHtml(safeUrl(content.settingsUrl))}" target="_blank" style="color:${LAKE};">Change these emails in Settings</a>`
    : "";

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escapeHtml(content.subject)}</title>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;700&amp;display=swap" rel="stylesheet">
${DARK_STYLES}
</head>
<body class="wf-body" style="margin:0;padding:0;background:${FROST};">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(content.preheader)}</div>
<table role="presentation" class="wf-frost" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${FROST}" style="background:${FROST};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;border-collapse:separate;">
<tr><td bgcolor="${NAVY}" style="background:${NAVY};padding:18px 32px;border-radius:10px 10px 0 0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td bgcolor="#FFFFFF" style="background:#FFFFFF;border-radius:4px;padding:4px;"><a href="${escapeHtml(site)}" target="_blank"><img src="${escapeHtml(logo)}" width="32" height="32" alt="WestForce logo" style="display:block;width:32px;height:32px;border:0;"></a></td>
<td style="padding-left:12px;font-family:${FONT};font-size:20px;font-weight:700;line-height:24px;color:#FFFFFF;">WestForce</td>
</tr></table>
</td></tr>
<tr><td class="wf-card" bgcolor="#FFFFFF" style="background:#FFFFFF;padding:32px;border:1px solid ${LINE};border-top:0;border-radius:0 0 10px 10px;">
<h1 class="wf-heading" style="margin:0 0 16px;font-family:${FONT};font-size:22px;font-weight:700;line-height:30px;color:${NAVY};">${escapeHtml(content.heading)}</h1>
${content.blocks.map(blockHtml).join("\n")}
</td></tr>
<tr><td class="wf-muted" style="padding:20px 32px;font-family:${FONT};font-size:12px;line-height:18px;color:${MUTED};text-align:center;">
${escapeHtml(content.reason)}${footerLinks}<br>
<a href="${escapeHtml(site)}" target="_blank" style="color:${MUTED};">WestForce</a>, portfolios for job seekers in Canada.
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    "WestForce",
    "",
    content.heading,
    "",
    ...content.blocks.flatMap((block) => [blockText(block), ""]),
    "--",
    content.reason,
    ...(content.settingsUrl ? [`Change these emails in Settings: ${content.settingsUrl}`] : []),
    `WestForce: ${site}`,
  ].join("\n");

  return { subject: content.subject, html, text };
}
