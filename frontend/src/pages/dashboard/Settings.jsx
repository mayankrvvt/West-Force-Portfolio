import { useEffect, useRef, useState } from "react";
import { AlertCircle, Bell, BellRing, Check, Globe2, LockKeyhole, Palette, Save, ShieldCheck } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { getJobPreferences, PROVINCES, saveJobPreferences } from "../../services/jobService";
import { SkeletonRows } from "../../components/dashboard/Skeleton";

const STORAGE_KEY = "westforce_settings";
const defaults = { emailUpdates: true, applicationReminders: true, publicPortfolio: true, compactMode: false };

function readSettings() {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
  } catch {
    return defaults;
  }
}

const GROUPS = [
  {
    id: "notifications",
    title: "Notifications",
    items: [
      { id: "emailUpdates", icon: Bell, title: "Email updates", text: "News about your resumes and new features." },
      { id: "applicationReminders", icon: BellRing, title: "Application reminders", text: "A nudge to follow up on jobs you applied to." },
    ],
  },
  {
    id: "sharing",
    title: "Sharing",
    items: [
      { id: "publicPortfolio", icon: Globe2, title: "Public portfolio", text: "Let people open your published portfolio from its link." },
    ],
  },
  {
    id: "workspace",
    title: "Workspace",
    items: [
      { id: "compactMode", icon: Palette, title: "Compact workspace", text: "Fit more on the screen with tighter spacing." },
    ],
  },
];

export default function Settings() {
  const [settings, setSettings] = useState(readSettings);
  const [savedSettings, setSavedSettings] = useState(settings);
  const [saved, setSaved] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const dirty = Object.keys(defaults).some((key) => settings[key] !== savedSettings[key]);

  const toggle = (key) => {
    setSettings((current) => ({ ...current, [key]: !current[key] }));
    setSaved(false);
  };

  const save = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* Storage can be blocked (private mode); the choices still apply for this visit. */
    }
    setSavedSettings(settings);
    setSaved(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setSaved(false), 2200);
  };

  return (
    <div className="dashboard-product">
      <header className="product-page-header">
        <div>
          <h1>Settings</h1>
          <p>Choose your job preferences, reminders, sharing and how your workspace looks.</p>
        </div>
      </header>

      <section className="product-card" aria-labelledby="preferences-title">
        <div className="product-card-header">
          <div>
            <h2 id="preferences-title">Preferences</h2>
            <p>Saved on this device. These choices don’t change your account yet.</p>
          </div>
        </div>
        {GROUPS.map((group) => (
          <div className="settings-group" key={group.id} role="group" aria-labelledby={`settings-${group.id}-title`}>
            <h3 className="settings-group-title" id={`settings-${group.id}-title`}>{group.title}</h3>
            <div className="product-setting-list">
              {group.items.map((item) => (
                <Setting key={item.id} {...item} checked={settings[item.id]} onChange={() => toggle(item.id)} />
              ))}
            </div>
          </div>
        ))}
        <div className="product-form-actions">
          <span className={`form-status ${saved ? "ok" : ""}`} role="status">
            {saved ? <><Check size={15} aria-hidden="true" />Saved on this device</> : dirty ? "You have unsaved changes" : ""}
          </span>
          <button type="button" className="product-button primary" onClick={save} disabled={!dirty}>
            <Save size={16} aria-hidden="true" /> Save settings
          </button>
        </div>
      </section>

      <JobPreferences />

      <section className="product-info-list" aria-label="Account and data">
        <div className="product-card info-card">
          <span className="product-setting-icon"><LockKeyhole size={18} aria-hidden="true" /></span>
          <h2>Sign in</h2>
          <p>You sign in with your email and password. If you forget your password, you can reset it from the sign in page.</p>
          <Link className="product-link" to="/auth/forgot-password">Reset your password</Link>
        </div>
        <div className="product-card info-card">
          <span className="product-setting-icon"><ShieldCheck size={18} aria-hidden="true" /></span>
          <h2>Your data</h2>
          <p>Your profile and the files you upload are kept with your account. Only what you publish appears on your public page.</p>
          <Link className="product-link" to="/dashboard/portfolio">Review your public page</Link>
        </div>
      </section>
    </div>
  );
}

const MAX_TITLES = 5;
const toForm = (prefs) => ({
  titles: (prefs.titles || []).join(", "),
  city: prefs.city || "",
  province: prefs.province || "",
  remoteOk: prefs.remoteOk !== false,
  weeklyEmail: prefs.weeklyEmail === true,
});

/** Job preferences, saved to the account. They drive "Jobs for you" and the daily job collector. */
function JobPreferences() {
  const { hash } = useLocation();
  const sectionRef = useRef(null);
  const [form, setForm] = useState(null);
  const [savedForm, setSavedForm] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [status, setStatus] = useState({ saving: false, saved: false, error: "" });

  useEffect(() => {
    let active = true;
    getJobPreferences()
      .then((prefs) => {
        if (!active) return;
        const next = toForm(prefs);
        setForm(next);
        setSavedForm(next);
      })
      .catch((err) => { if (active) setLoadError(err.message || "Could not load your job preferences. Please reload the page."); });
    return () => { active = false; };
  }, []);

  // Opened from "Set your job preferences" on the Jobs page.
  useEffect(() => {
    if (hash === "#job-preferences" && form) sectionRef.current?.scrollIntoView({ block: "start" });
  }, [hash, form]);

  const titles = (form?.titles || "").split(",").map((title) => title.trim()).filter(Boolean);
  const dirty = Boolean(form && savedForm) && Object.keys(form).some((key) => form[key] !== savedForm[key]);
  const tooMany = titles.length > MAX_TITLES;

  const setField = (key) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
    setStatus((current) => ({ ...current, saved: false, error: "" }));
  };

  const save = async (event) => {
    event.preventDefault();
    if (!form || tooMany) return;
    setStatus({ saving: true, saved: false, error: "" });
    try {
      const next = toForm(await saveJobPreferences({ titles, city: form.city.trim(), province: form.province, remoteOk: form.remoteOk, weeklyEmail: form.weeklyEmail }));
      setForm(next);
      setSavedForm(next);
      setStatus({ saving: false, saved: true, error: "" });
    } catch (err) {
      setStatus({ saving: false, saved: false, error: err.message || "Could not save your job preferences. Please try again." });
    }
  };

  return (
    <section className="product-card job-preferences" id="job-preferences" ref={sectionRef} aria-labelledby="job-preferences-title">
      <div className="product-card-header">
        <div>
          <h2 id="job-preferences-title">Job preferences</h2>
          <p>Saved to your account. We use them to pick “Jobs for you” in Canada.</p>
        </div>
      </div>
      {loadError ? <div className="product-error" role="alert"><AlertCircle size={16} aria-hidden="true" /><span>{loadError}</span></div>
        : !form ? <SkeletonRows count={3} label="Loading job preferences" />
        : <form onSubmit={save} noValidate>
          <div className="product-form-grid">
            <label className="product-field full">
              Job titles
              <input className="product-input" value={form.titles} onChange={setField("titles")} placeholder="Personal support worker, home support worker" aria-describedby="job-titles-hint" aria-invalid={tooMany} autoComplete="off" />
              <span className="field-hint" id="job-titles-hint">{tooMany ? `Add at most ${MAX_TITLES} job titles.` : `Up to ${MAX_TITLES}, separated by commas.`}</span>
            </label>
            <label className="product-field">
              City
              <input className="product-input" value={form.city} onChange={setField("city")} placeholder="Brampton" maxLength={80} autoComplete="address-level2" />
            </label>
            <label className="product-field">
              Province or territory
              <select className="product-input" value={form.province} onChange={setField("province")}>
                <option value="">Not set</option>
                {PROVINCES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
              </select>
            </label>
            <label className="product-checkbox full">
              <input type="checkbox" checked={form.remoteOk} onChange={setField("remoteOk")} />
              <span><strong>Open to remote work</strong><span>Rank remote jobs in Canada higher.</span></span>
            </label>
            <label className="product-checkbox full">
              <input type="checkbox" checked={form.weeklyEmail} onChange={setField("weeklyEmail")} />
              <span><strong>Email me new jobs for you each week</strong><span>Sent on Mondays to your verified email. Only jobs posted that week.</span></span>
            </label>
          </div>
          {status.error && <div className="product-error" role="alert"><AlertCircle size={16} aria-hidden="true" /><span>{status.error}</span></div>}
          <div className="product-form-actions">
            <span className={`form-status ${status.saved ? "ok" : ""}`} role="status">
              {status.saved ? <><Check size={15} aria-hidden="true" />Job preferences saved</> : dirty ? "You have unsaved changes" : ""}
            </span>
            <button type="submit" className="product-button primary" disabled={!dirty || tooMany || status.saving}>
              <Save size={16} aria-hidden="true" /> {status.saving ? "Saving…" : "Save job preferences"}
            </button>
          </div>
        </form>}
    </section>
  );
}

function Setting({ id, icon, title, text, checked, onChange }) {
  // Capitalised so JSX treats it as a component (and lint sees it used).
  const Icon = icon;
  const inputId = `setting-${id}`;
  return (
    <div className="product-setting">
      <span className="product-setting-icon"><Icon size={18} aria-hidden="true" /></span>
      <label className="product-setting-copy" htmlFor={inputId}>
        <strong>{title}</strong>
        <small id={`${inputId}-text`}>{text}</small>
      </label>
      <input
        id={inputId}
        type="checkbox"
        role="switch"
        className="product-switch"
        checked={checked}
        aria-checked={checked}
        aria-describedby={`${inputId}-text`}
        onChange={onChange}
      />
    </div>
  );
}
