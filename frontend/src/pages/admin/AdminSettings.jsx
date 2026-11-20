import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Megaphone, Power, ToggleRight } from "lucide-react";

import { getSettings, updateSettings } from "../../services/adminService";
import { formatDate } from "../../utils/formatDate";
import PageSkeleton from "../../components/dashboard/Skeleton";
import usePageTitle from "../../hooks/usePageTitle";
import useSiteStatus from "../../hooks/useSiteStatus";
import { focusOnMount } from "../../hooks/useFocusLater";

const MESSAGE_MAX = 300;
const BANNER_MAX = 200;

const FEATURES = [
  { key: "signups", name: "Sign ups", hint: "New people can create an account." },
  { key: "payments", name: "Payments", hint: "People can buy a plan through checkout." },
  { key: "ai", name: "AI tools", hint: "Resume builder, ATS checker, tailor resume and the chat helper." },
  { key: "jobs", name: "Job search", hint: "Job seekers can search jobs in Find jobs." },
];

const GROUPS = ["maintenance", "banner", "features"];

function toForm(settings) {
  return {
    maintenance: { on: settings?.maintenance?.on === true, message: settings?.maintenance?.message || "" },
    banner: { on: settings?.banner?.on === true, text: settings?.banner?.text || "", tone: settings?.banner?.tone === "warning" ? "warning" : "info" },
    features: Object.fromEntries(FEATURES.map(({ key }) => [key, settings?.features?.[key] !== false])),
  };
}

const clean = (value) => (typeof value === "string" ? value.trim() : value);

/** Only the nested fields that differ from what was loaded, e.g. { banner: { text } }. */
function changedFields(saved, form) {
  const changes = {};
  for (const group of GROUPS) {
    for (const [key, value] of Object.entries(form[group])) {
      if (clean(value) !== clean(saved[group][key])) {
        changes[group] = { ...changes[group], [key]: clean(value) };
      }
    }
  }
  return changes;
}

export default function AdminSettings() {
  usePageTitle("Site settings");
  const { refresh } = useSiteStatus();
  const [saved, setSaved] = useState(null);
  const [form, setForm] = useState(() => toForm(null));
  const [meta, setMeta] = useState({ updatedBy: null, updatedAt: null });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmShutdown, setConfirmShutdown] = useState(false);
  const mountedRef = useRef(true);
  const shutdownSwitchRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const apply = (settings) => {
    const next = toForm(settings);
    setSaved(next);
    setForm(next);
    setMeta({ updatedBy: settings?.updatedBy || null, updatedAt: settings?.updatedAt || null });
  };

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const settings = await getSettings();
      if (mountedRef.current) apply(settings);
    } catch (err) {
      if (mountedRef.current) setLoadError(err.message || "Could not load the site settings.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (group, key) => (event) => {
    const { type, checked, value } = event.target;
    setForm((current) => ({ ...current, [group]: { ...current[group], [key]: type === "checkbox" ? checked : value } }));
    setNotice("");
    setSaveError("");
  };

  const toggleShutdown = (event) => {
    setNotice("");
    if (event.target.checked) {
      setConfirmShutdown(true);
      return;
    }
    setConfirmShutdown(false);
    setForm((current) => ({ ...current, maintenance: { ...current.maintenance, on: false } }));
  };

  const confirmOn = () => {
    setForm((current) => ({ ...current, maintenance: { ...current.maintenance, on: true } }));
    setConfirmShutdown(false);
    shutdownSwitchRef.current?.focus();
  };

  const cancelShutdown = () => {
    setConfirmShutdown(false);
    shutdownSwitchRef.current?.focus();
  };

  const changes = saved ? changedFields(saved, form) : {};
  const dirty = Object.keys(changes).length > 0;
  const canSave = Boolean(saved) && !loading && !loadError && !saving && dirty && !confirmShutdown;

  const save = async (event) => {
    event.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setSaveError("");
    setNotice("");
    try {
      const settings = await updateSettings(changes);
      if (!mountedRef.current) return;
      apply(settings);
      setNotice("Saved. Visitors see the change within a minute.");
      refresh();
    } catch (err) {
      if (mountedRef.current) setSaveError(err.message || "Could not save the site settings.");
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  };

  const reset = () => {
    if (saved) setForm(saved);
    setConfirmShutdown(false);
    setSaveError("");
  };

  if (loading) {
    return <div className="dashboard-product"><PageSkeleton layout="form" label="Loading site settings" /></div>;
  }

  if (loadError) {
    return <div className="dashboard-product">
      <div className="empty-product" role="alert">
        <span className="empty-product-icon"><AlertCircle size={22} aria-hidden="true" /></span>
        <h2>Could not load the site settings</h2>
        <p>{loadError}</p>
        <button type="button" className="product-button primary" onClick={load}>Try again</button>
      </div>
    </div>;
  }

  return <form className="dashboard-product admin-settings" onSubmit={save} noValidate>
    <header className="product-page-header">
      <div>
        <h1>Site settings</h1>
        <p>{meta.updatedAt
          ? `Last changed by ${meta.updatedBy || "an admin"} on ${formatDate(meta.updatedAt)}.`
          : "Turn parts of the site off for a while, or show a notice to everyone."}</p>
      </div>
    </header>

    <div aria-live="polite">
      {notice && <div className="product-notice"><CheckCircle2 size={16} aria-hidden="true" /><span>{notice}</span></div>}
    </div>

    {/* Locked while saving, so nothing typed now is lost when the reply comes back. */}
    <fieldset className="admin-settings-fields" disabled={saving}>
    <section className={`product-card admin-settings-card${form.maintenance.on ? " is-danger" : ""}`} aria-labelledby="admin-shutdown-title">
      <div className="product-setting">
        <span className="product-setting-icon"><Power size={18} aria-hidden="true" /></span>
        <label className="product-setting-copy" htmlFor="admin-shutdown">
          <strong id="admin-shutdown-title">Shut down website</strong>
          <small>Visitors see a &ldquo;We&rsquo;ll be back soon&rdquo; page. Admins can still use everything.</small>
        </label>
        <input
          id="admin-shutdown"
          ref={shutdownSwitchRef}
          className="product-switch"
          type="checkbox"
          role="switch"
          checked={form.maintenance.on || confirmShutdown}
          onChange={toggleShutdown}
        />
      </div>

      {confirmShutdown && <div className="admin-settings-confirm" role="alertdialog" aria-labelledby="admin-shutdown-confirm">
        <AlertTriangle size={16} aria-hidden="true" />
        <p id="admin-shutdown-confirm">Visitors will see a &lsquo;We&rsquo;ll be back soon&rsquo; page. Admins can still use everything.</p>
        <div className="admin-settings-confirm-actions">
          <button type="button" className="product-button compact" ref={focusOnMount} onClick={cancelShutdown}>Cancel</button>
          <button type="button" className="product-button compact admin-job-delete" onClick={confirmOn}>Shut down</button>
        </div>
      </div>}

      {form.maintenance.on && saved.maintenance.on === false && !confirmShutdown && <p className="admin-settings-warning" role="status">
        <AlertTriangle size={14} aria-hidden="true" />The site shuts down when you save.
      </p>}

      <label className="product-field full">
        Message for visitors (optional)
        <textarea
          className="product-textarea"
          rows={3}
          maxLength={MESSAGE_MAX}
          value={form.maintenance.message}
          onChange={set("maintenance", "message")}
          placeholder="We are making WestForce better. Please come back in an hour."
          aria-describedby="admin-shutdown-count"
        />
        <span className="field-hint" id="admin-shutdown-count">{form.maintenance.message.length} of {MESSAGE_MAX} characters</span>
      </label>
    </section>

    <section className="product-card admin-settings-card" aria-labelledby="admin-banner-title">
      <div className="product-setting">
        <span className="product-setting-icon"><Megaphone size={18} aria-hidden="true" /></span>
        <label className="product-setting-copy" htmlFor="admin-banner">
          <strong id="admin-banner-title">Banner</strong>
          <small>A short notice across the top of every page. People can close it.</small>
        </label>
        <input id="admin-banner" className="product-switch" type="checkbox" role="switch" checked={form.banner.on} onChange={set("banner", "on")} />
      </div>

      <div className="product-form-grid">
        <label className="product-field full">
          Banner text
          <input
            className="product-input"
            maxLength={BANNER_MAX}
            value={form.banner.text}
            onChange={set("banner", "text")}
            placeholder="Checkout is slow today. Thanks for your patience."
            aria-describedby="admin-banner-count"
            autoComplete="off"
          />
          <span className="field-hint" id="admin-banner-count">{form.banner.text.length} of {BANNER_MAX} characters</span>
        </label>
        <fieldset className="product-field full admin-tone">
          <legend>Tone</legend>
          <div className="admin-tone-options">
            {[["info", "Info"], ["warning", "Warning"]].map(([value, label]) => (
              <label className={`admin-tone-option tone-${value}${form.banner.tone === value ? " selected" : ""}`} key={value}>
                <input type="radio" name="banner-tone" value={value} checked={form.banner.tone === value} onChange={set("banner", "tone")} />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      {form.banner.on && !form.banner.text.trim() && <p className="field-hint">The banner stays hidden until it has some text.</p>}
    </section>

    <section className="product-card admin-settings-card" aria-labelledby="admin-features-title">
      <div className="product-card-header">
        <div>
          <h2 id="admin-features-title">Features</h2>
          <p>Switch a part of the site off for everyone. People see a short &ldquo;paused&rdquo; note instead.</p>
        </div>
      </div>
      <div className="product-setting-list">
        {FEATURES.map(({ key, name, hint }) => (
          <div className="product-setting" key={key}>
            <span className="product-setting-icon"><ToggleRight size={18} aria-hidden="true" /></span>
            <label className="product-setting-copy" htmlFor={`admin-feature-${key}`}>
              <strong>{name}</strong>
              <small>{hint}</small>
            </label>
            <input id={`admin-feature-${key}`} className="product-switch" type="checkbox" role="switch" checked={form.features[key]} onChange={set("features", key)} />
          </div>
        ))}
      </div>
    </section>
    </fieldset>

    {saveError && <div className="product-error" role="alert"><AlertCircle size={16} aria-hidden="true" /><span>{saveError}</span></div>}

    <div className="product-form-actions admin-settings-actions">
      <button type="button" className="product-button" onClick={reset} disabled={!dirty || saving}>Undo changes</button>
      <button type="submit" className="product-button primary" disabled={!canSave}>{saving ? "Saving..." : "Save settings"}</button>
    </div>
  </form>;
}
