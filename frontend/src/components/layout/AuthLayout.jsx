import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

import MapleLeaf from "../brand/MapleLeaf";

const SAMPLE_SECTIONS = [
  { name: "Resume", detail: "PDF, 2 pages" },
  { name: "Certificates", detail: "3 files" },
  { name: "Intro video", detail: "1 min 24 s" },
  { name: "Experience", detail: "4 roles" },
];

const ALERT_ICONS = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info,
};

/**
 * Message box above or inside an auth form.
 * tone: error (announced right away), info or success (announced politely).
 */
export function AuthAlert({ tone = "error", children }) {
  const Icon = ALERT_ICONS[tone] || Info;

  return (
    <div
      className={`auth-alert auth-alert-${tone}`}
      role={tone === "error" ? "alert" : "status"}
    >
      <Icon className="auth-alert-icon" size={18} aria-hidden="true" />
      <div className="auth-alert-body">{children}</div>
    </div>
  );
}

/**
 * Split page frame for sign in, sign up and password pages.
 * The form column comes first in the DOM; the navy panel is a visual aside
 * (left on desktop, hidden on phones so the form comes first).
 */
export default function AuthLayout({ title, lede, icon, children, footer }) {
  return (
    <div className="auth-page">
      <main className="auth-main">
        <div className="auth-main-inner">
          <Link to="/" className="auth-brand">
            <img src="/favicon.png" alt="" className="auth-brand-mark" width="32" height="32" />
            <span>WestForce</span>
          </Link>

          <div className="auth-card">
            {icon && (
              <span className="auth-status-icon" aria-hidden="true">
                {icon}
              </span>
            )}

            <h1>{title}</h1>

            {lede && <p className="auth-lede">{lede}</p>}

            {children}
          </div>

          {footer && <div className="auth-footer">{footer}</div>}
        </div>
      </main>

      <aside className="auth-aside" aria-label="About WestForce">
        <div className="auth-aside-leaf">
          <MapleLeaf outline />
        </div>

        <div className="auth-aside-copy">
          <p className="auth-aside-title">
            One link for your resume, certificates and video.
          </p>
          <p className="auth-aside-sub">
            Share it with employers across Canada. You choose who opens your documents.
          </p>
        </div>

        <figure className="auth-sample" aria-hidden="true">
          <div className="auth-sample-head">
            <span className="auth-sample-avatar">ET</span>
            <span className="auth-sample-person">
              <strong>Emma Tremblay</strong>
              <span>Personal support worker, Brampton, ON</span>
            </span>
          </div>

          <ul className="auth-sample-rows">
            {SAMPLE_SECTIONS.map((section, index) => (
              <li key={section.name} style={{ "--row": index }}>
                <svg className="auth-sample-check" viewBox="0 0 20 20" focusable="false">
                  <circle cx="10" cy="10" r="9" />
                  <path d="M6 10.4l2.6 2.6L14 7.6" pathLength="1" />
                </svg>
                <span className="auth-sample-name">{section.name}</span>
                <span className="auth-sample-detail">{section.detail}</span>
              </li>
            ))}
          </ul>

          <figcaption className="auth-sample-foot">
            <span className="wf-seal">
              <MapleLeaf width="14" height="14" />
              PIN protected
            </span>
          </figcaption>
        </figure>
      </aside>
    </div>
  );
}
