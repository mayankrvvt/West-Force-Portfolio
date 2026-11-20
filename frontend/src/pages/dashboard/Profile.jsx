import { useEffect, useRef, useState } from "react";
import { AlertCircle, Check, MapPin, Save } from "lucide-react";
import { apiRequest } from "../../utils/api";

const EMPTY = { name: "", title: "", location: "", email: "", phone: "" };
const FIELD_COUNT = Object.keys(EMPTY).length;

const SECTIONS = [
  {
    id: "about",
    title: "About you",
    text: "Shown at the top of your portfolio and resumes.",
    fields: [
      { name: "name", label: "Full name", autoComplete: "name", full: true },
      { name: "title", label: "Professional title", autoComplete: "organization-title", placeholder: "For example, Personal support worker" },
      { name: "location", label: "Location", autoComplete: "address-level2", placeholder: "For example, Brampton, ON" },
    ],
  },
  {
    id: "contact",
    title: "Contact",
    text: "How employers can reach you.",
    fields: [
      { name: "email", label: "Email", type: "email", autoComplete: "email" },
      { name: "phone", label: "Phone", type: "tel", autoComplete: "tel" },
    ],
  },
];

function initialsOf(name) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export default function Profile() {
  const [form, setForm] = useState(EMPTY);
  const [savedForm, setSavedForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const timer = useRef(null);

  useEffect(() => {
    let active = true;
    apiRequest("/api/portfolios/me")
      .then((r) => {
        if (!active) return;
        const p = r?.portfolio || r?.data || r;
        const next = Object.fromEntries(Object.keys(EMPTY).map((key) => [key, p?.profile?.[key] || ""]));
        setForm(next);
        setSavedForm(next);
      })
      // Saving a blank form after a failed load would wipe the real profile, so the form stays hidden.
      .catch(() => { if (active) setLoadError("We could not load your profile. Check your connection and try again."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; clearTimeout(timer.current); };
  }, [attempt]);

  const retry = () => {
    setLoadError("");
    setLoading(true);
    setAttempt((n) => n + 1);
  };

  const dirty = Object.keys(EMPTY).some((key) => form[key] !== savedForm[key]);

  const change = (e) => {
    setForm((v) => ({ ...v, [e.target.name]: e.target.value }));
    if (message?.ok) setMessage(null);
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    clearTimeout(timer.current);
    try {
      await apiRequest("/api/portfolios/me", { method: "PUT", body: JSON.stringify({ profile: form }) });
      setSavedForm(form);
      setMessage({ ok: true, text: "Profile saved" });
      timer.current = setTimeout(() => setMessage(null), 3000);
    } catch (e) {
      setMessage({ ok: false, text: e.message || "Could not save your profile. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const name = form.name.trim();
  // Counts what is saved, so the meter does not jump while typing.
  const filled = Object.keys(EMPTY).filter((key) => savedForm[key].trim()).length;

  return <div className="dashboard-product">
    <header className="product-page-header"><div><h1>Profile</h1><p>Your profile feeds your portfolio, the resume builder and your account name.</p></div></header>

    <section className="profile-identity" aria-label="Profile summary">
      <span className="profile-avatar" aria-hidden="true">{initialsOf(name) || "?"}</span>
      <div className="profile-identity-copy">
        {loading ? <><span className="skeleton" style={{ width: 180 }} /><span className="skeleton skeleton-small" style={{ width: 120 }} /></>
          : loadError ? <h2>Profile not loaded</h2>
          : <>
            <h2>{name || "Add your name"}</h2>
            <p>
              <span>{form.title.trim() || "No professional title yet"}</span>
              {form.location.trim() && <span className="profile-identity-location"><MapPin size={13} aria-hidden="true"/>{form.location.trim()}</span>}
            </p>
          </>}
      </div>
      {!loading && !loadError && <div className="profile-completeness">
        <span><strong>{filled} of {FIELD_COUNT}</strong> details added</span>
        <div className="progress-bar" role="progressbar" aria-valuemin={0} aria-valuemax={FIELD_COUNT} aria-valuenow={filled} aria-label="Profile details added">
          <span style={{ transform: `scaleX(${filled / FIELD_COUNT})` }} />
        </div>
      </div>}
    </section>

    {loading ? <div className="product-card product-form-grid" role="status"><span className="sr-only">Loading profile…</span>{[0, 1, 2, 3].map((i) => <div className="skeleton-stack" key={i} aria-hidden="true"><span className="skeleton skeleton-small" style={{ width: "35%" }}/><span className="skeleton skeleton-input"/></div>)}</div>
      : loadError ? <div className="product-error" role="alert"><AlertCircle size={16} aria-hidden="true"/><span>{loadError}</span><button type="button" className="product-button" onClick={retry}>Try again</button></div>
      : <form className="product-card profile-form" onSubmit={save} noValidate>
        {SECTIONS.map((section) => <section className="profile-section" key={section.id} aria-labelledby={`profile-${section.id}-title`}>
          <div className="profile-section-intro">
            <h2 id={`profile-${section.id}-title`}>{section.title}</h2>
            <p>{section.text}</p>
          </div>
          <div className="product-form-grid">
            {section.fields.map((field) => <div className={`product-field ${field.full ? "full" : ""}`} key={field.name}>
              <label htmlFor={`profile-${field.name}`}>{field.label}</label>
              <input id={`profile-${field.name}`} className="product-input" name={field.name} type={field.type || "text"} autoComplete={field.autoComplete} placeholder={field.placeholder} value={form[field.name]} onChange={change}/>
            </div>)}
          </div>
        </section>)}
        <div className="product-form-actions sticky">
          <span className={`form-status ${message ? (message.ok ? "ok" : "error") : ""}`} role={message && !message.ok ? "alert" : "status"}>
            {message ? <>{message.ok ? <Check size={15} aria-hidden="true"/> : <AlertCircle size={15} aria-hidden="true"/>}{message.text}</>
              : dirty ? "You have unsaved changes" : "All changes saved"}
          </span>
          <button type="button" className="product-button" disabled={!dirty || saving} onClick={() => { setForm(savedForm); setMessage(null); }}>Discard</button>
          <button type="submit" className="product-button primary" disabled={saving || !dirty}><Save size={16} aria-hidden="true"/>{saving ? "Saving…" : "Save profile"}</button>
        </div>
      </form>}
  </div>;
}
