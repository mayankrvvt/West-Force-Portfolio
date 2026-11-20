import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, BriefcaseBusiness, CalendarDays, CheckCircle2, Clock, Eye, EyeOff, MapPin, Pencil, Plus, RefreshCw, Tag, Trash2, Wallet } from "lucide-react";

import { createJob, deleteJob, listAdminJobs, updateJob } from "../../services/adminService";
import { formatSalary } from "../../services/jobService";
import { formatDate } from "../../utils/formatDate";
import PageSkeleton from "../../components/dashboard/Skeleton";
import StatusBadge from "../../components/dashboard/StatusBadge";
import usePageTitle from "../../hooks/usePageTitle";
import useFocusLater, { focusOnMount } from "../../hooks/useFocusLater";

const COLUMNS = ["Live", "Hidden", "Expired"];
const DEFAULT_DAYS = 60;
const MAX_TAGS = 10;
const JOB_TYPES = ["Full time", "Part time", "Contract", "Temporary", "Casual"];

const EMPTY_FORM = {
  title: "",
  company: "",
  location: "",
  type: "",
  salaryMin: "",
  salaryMax: "",
  description: "",
  url: "",
  tags: "",
  hidden: false,
  expiresAt: "",
  neverExpires: false,
};

function jobStatus(job) {
  if (job.hidden) return "Hidden";
  if (job.expiresAt && new Date(job.expiresAt).getTime() < Date.now()) return "Expired";
  return "Live";
}

// "2026-11-20" in local time, for <input type="date">.
function toDateInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Noon local time, so the date never slips a day across time zones.
const dateInputToLabel = (value) => formatDate(`${value}T12:00:00`);

function toForm(job) {
  if (!job) return EMPTY_FORM;
  return {
    title: job.title || "",
    company: job.company || "",
    location: job.location || "",
    type: job.type || "",
    salaryMin: job.salaryMin ?? "",
    salaryMax: job.salaryMax ?? "",
    description: job.description || "",
    url: job.url || "",
    tags: (job.tags || []).join(", "),
    hidden: job.hidden === true,
    expiresAt: toDateInput(job.expiresAt),
    neverExpires: job.expiresAt === null,
  };
}

// Form values in the shape the server takes.
function toFields(form) {
  const money = (value) => (String(value).trim() === "" ? null : Number(value));
  return {
    title: form.title.trim(),
    company: form.company.trim(),
    location: form.location.trim(),
    type: form.type.trim(),
    salaryMin: money(form.salaryMin),
    salaryMax: money(form.salaryMax),
    description: form.description.trim(),
    url: form.url.trim(),
    tags: [...new Set(form.tags.split(",").map((tag) => tag.trim()).filter(Boolean))],
    hidden: form.hidden,
    // The end of the chosen day. Blank on a new job lets the server pick 60 days.
    expiresAt: form.neverExpires ? null : form.expiresAt ? new Date(`${form.expiresAt}T23:59:59`).toISOString() : undefined,
  };
}

function validate(form, isNew) {
  if (!form.title.trim()) return "Add a job title.";
  if (!form.company.trim()) return "Add the company name.";
  if (!form.location.trim()) return "Add a location in Canada.";
  for (const [key, label] of [["salaryMin", "lowest"], ["salaryMax", "highest"]]) {
    const value = String(form[key]).trim();
    if (value && !/^\d+$/.test(value)) return `The ${label} salary must be a whole number.`;
  }
  if (form.salaryMin !== "" && form.salaryMax !== "" && Number(form.salaryMin) > Number(form.salaryMax)) {
    return "The lowest salary can't be more than the highest.";
  }
  const url = form.url.trim();
  if (url) {
    let parsed = null;
    try { parsed = new URL(url); } catch { /* checked below */ }
    if (parsed?.protocol !== "https:") return "The apply link must start with https://";
  }
  const tagCount = toFields(form).tags.length;
  if (tagCount > MAX_TAGS) return `Use ${MAX_TAGS} tags at most. You have ${tagCount}.`;
  if (!isNew && !form.neverExpires && !form.expiresAt) return "Pick an end date, or choose Never expires.";
  return "";
}

// Only the fields that differ from the saved job.
function changedFields(job, form) {
  const before = toFields(toForm(job));
  const after = toFields(form);
  return Object.fromEntries(
    Object.entries(after).filter(([key, value]) => value !== undefined && JSON.stringify(value) !== JSON.stringify(before[key]))
  );
}

function expiryHint(form) {
  if (form.neverExpires) return "Never expires. It stays up until you hide or delete it.";
  if (form.expiresAt) return `Shows until ${dateInputToLabel(form.expiresAt)}.`;
  const fallback = new Date(Date.now() + DEFAULT_DAYS * 24 * 60 * 60 * 1000);
  return `Shows until ${formatDate(fallback)} if you leave it blank (${DEFAULT_DAYS} days).`;
}

const byNewest = (a, b) => String(b.postedAt || "").localeCompare(String(a.postedAt || ""));

export default function AdminJobs() {
  usePageTitle("Manage jobs");

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [confirmId, setConfirmId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [cardError, setCardError] = useState({ id: null, message: "" });
  const formRef = useRef(null);
  const titleRef = useRef(null);
  const mountedRef = useRef(false);
  const headingRef = useRef(null);
  const listRef = useRef(null);
  const focusLater = useFocusLater();

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const items = await listAdminJobs();
      if (mountedRef.current) setJobs(items);
    } catch (err) {
      if (mountedRef.current) setLoadError(err.message || "Could not load jobs.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => { mountedRef.current = false; };
  }, [load]);

  // Edit mode follows editingId, not the lookup: if the job vanished after a
  // refresh, Save must not quietly turn into "Add" and POST a duplicate.
  const editingJob = editingId ? jobs.find((job) => job._id === editingId) : null;
  const isNew = !editingId;
  const jobRemoved = Boolean(editingId) && !loading && !editingJob;
  const canSave = !loading && !loadError && !saving && !jobRemoved;

  const focusForm = () => {
    formRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    titleRef.current?.focus({ preventScroll: true });
  };

  const startNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setNotice("");
    focusForm();
  };

  const startEdit = (job) => {
    setEditingId(job._id);
    setForm(toForm(job));
    setFormError("");
    setNotice("");
    setConfirmId(null);
    focusForm();
  };

  const setField = (key) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
  };

  const replaceJob = (updated) => setJobs((items) => items.map((item) => (item._id === updated._id ? updated : item)));

  const save = async (event) => {
    event.preventDefault();
    if (!canSave) return;
    setNotice("");
    const problem = validate(form, isNew);
    if (problem) {
      setFormError(problem);
      return;
    }
    setFormError("");

    let payload;
    if (isNew) {
      // Leave out blank optional fields so the server uses its defaults.
      // expiresAt stays when it is null (Never expires).
      payload = Object.fromEntries(
        Object.entries(toFields(form)).filter(([key, value]) =>
          value !== undefined && value !== "" && !(Array.isArray(value) && !value.length) && !(value === null && key !== "expiresAt"))
      );
    } else {
      payload = changedFields(editingJob, form);
      if (!Object.keys(payload).length) {
        setNotice("No changes to save.");
        return;
      }
    }

    setSaving(true);
    try {
      if (isNew) {
        const job = await createJob(payload);
        if (!mountedRef.current) return;
        setJobs((items) => [job, ...items]);
        setForm(EMPTY_FORM);
        setNotice(`Added ${job.title}.`);
      } else {
        const job = await updateJob(editingJob._id, payload);
        if (!mountedRef.current) return;
        replaceJob(job);
        setEditingId(null);
        setForm(EMPTY_FORM);
        setNotice(`Saved ${job.title}.`);
      }
    } catch (err) {
      if (mountedRef.current) setFormError(err.message || "Could not save the job.");
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  };

  const toggleHidden = async (job) => {
    setBusyId(job._id);
    setCardError({ id: null, message: "" });
    setNotice("");
    try {
      const updated = await updateJob(job._id, { hidden: !job.hidden });
      if (!mountedRef.current) return;
      replaceJob(updated);
      if (editingId === job._id) setForm((current) => ({ ...current, hidden: updated.hidden === true }));
    } catch (err) {
      if (mountedRef.current) setCardError({ id: job._id, message: err.message || "Could not change the job." });
    } finally {
      if (mountedRef.current) setBusyId(null);
    }
  };

  const remove = async (job) => {
    setBusyId(job._id);
    setCardError({ id: null, message: "" });
    setNotice("");
    try {
      const message = await deleteJob(job._id);
      if (!mountedRef.current) return;
      setConfirmId(null);
      setJobs((items) => items.filter((item) => item._id !== job._id));
      if (editingId === job._id) {
        setEditingId(null);
        setForm(EMPTY_FORM);
      }
      setNotice(message || `Deleted ${job.title}.`);
      focusLater(() => headingRef.current);
    } catch (err) {
      if (mountedRef.current) setCardError({ id: job._id, message: err.message || "Could not delete the job." });
    } finally {
      if (mountedRef.current) setBusyId(null);
    }
  };

  const cancelRemove = (id) => {
    setConfirmId(null);
    // The delete button comes back on the next render; put focus on it again.
    focusLater(() => [...(listRef.current?.querySelectorAll("[data-delete-id]") || [])]
      .find((node) => node.dataset.deleteId === String(id)));
  };

  const sorted = [...jobs].sort(byNewest);

  const renderCard = (job) => {
    const status = jobStatus(job);
    const salary = formatSalary(job);
    const busy = busyId === job._id;
    const confirming = confirmId === job._id;
    return <article className={`application-card admin-job-card${editingId === job._id ? " is-editing" : ""}`} key={job._id}>
      <div className="application-card-top">
        <span className="application-card-avatar" aria-hidden="true">{(job.company || job.title || "?").trim().charAt(0)}</span>
        <div className="application-card-head">
          <strong>{job.title}</strong>
          <span>{job.company}</span>
        </div>
        <StatusBadge status={status} />
      </div>
      <div className="application-card-meta">
        {job.location && <span><MapPin size={12} aria-hidden="true" />{job.location}{job.type ? `, ${job.type}` : ""}</span>}
        {salary && <span><Wallet size={12} aria-hidden="true" />{salary}</span>}
        {job.tags?.length > 0 && <span><Tag size={12} aria-hidden="true" />{job.tags.join(", ")}</span>}
        <span><CalendarDays size={12} aria-hidden="true" />
          {!job.expiresAt ? "Never expires" : status === "Expired" ? `Ended ${formatDate(job.expiresAt)}` : `Shows until ${formatDate(job.expiresAt)}`}
        </span>
        {job.postedAt && <span className="application-card-updated"><Clock size={12} aria-hidden="true" />Posted {formatDate(job.postedAt)}</span>}
      </div>
      {cardError.id === job._id && <div className="product-error" role="alert"><AlertCircle size={14} aria-hidden="true" /><span>{cardError.message}</span></div>}
      {confirming ? <div className="application-card-actions admin-job-confirm" role="group" aria-label={`Delete ${job.title}?`}>
        <span>Delete this job?</span>
        <button type="button" className="product-button compact" ref={focusOnMount} onClick={() => cancelRemove(job._id)} disabled={busy}>Cancel</button>
        <button type="button" className="product-button compact admin-job-delete" onClick={() => remove(job)} disabled={busy}>{busy ? "Deleting..." : "Delete"}</button>
      </div>
        : <div className="application-card-actions">
          <button type="button" className="icon-button" title="Edit" aria-label={`Edit ${job.title}`} onClick={() => startEdit(job)}><Pencil size={15} aria-hidden="true" /></button>
          <button type="button" className="product-button compact admin-job-toggle" onClick={() => toggleHidden(job)} disabled={busy} aria-label={`${job.hidden ? "Show" : "Hide"} ${job.title}`}>
            {job.hidden ? <Eye size={15} aria-hidden="true" /> : <EyeOff size={15} aria-hidden="true" />}
            {job.hidden ? "Show" : "Hide"}
          </button>
          <button type="button" className="icon-button danger" title="Delete" aria-label={`Delete ${job.title}`} data-delete-id={job._id} onClick={() => { setConfirmId(job._id); setCardError({ id: null, message: "" }); }} disabled={busy}><Trash2 size={15} aria-hidden="true" /></button>
        </div>}
    </article>;
  };

  return <div className="dashboard-product">
    <header className="product-page-header">
      <div><h1 ref={headingRef} tabIndex={-1}>Manage jobs</h1><p>Add jobs by hand, edit them, and choose which ones job seekers can see.</p></div>
      <div className="product-actions">
        <button type="button" className="product-button" onClick={load} disabled={loading}><RefreshCw size={16} aria-hidden="true" /> Refresh</button>
        <button type="button" className="product-button primary" onClick={startNew}><Plus size={16} aria-hidden="true" /> Add job</button>
      </div>
    </header>

    <div aria-live="polite">
      {notice && <div className="product-notice"><CheckCircle2 size={16} aria-hidden="true" /><span>{notice}</span></div>}
    </div>

    <div className="admin-jobs-layout">
      <section className="admin-jobs-list" aria-label="Jobs" ref={listRef}>
        {loading ? <PageSkeleton layout="list" label="Loading jobs" />
          : loadError ? <div className="empty-product" role="alert">
            <span className="empty-product-icon"><AlertCircle size={22} aria-hidden="true" /></span>
            <h2>Could not load jobs</h2>
            <p>{loadError}</p>
            <button type="button" className="product-button primary" onClick={load}>Try again</button>
          </div>
          : !jobs.length ? <div className="empty-product">
            <span className="empty-product-icon"><BriefcaseBusiness size={22} aria-hidden="true" /></span>
            <h2>Nothing here yet</h2>
            <p>Jobs you add show up here. Job seekers see the live ones in Find jobs.</p>
          </div>
          : COLUMNS.map((column) => {
            const items = sorted.filter((job) => jobStatus(job) === column);
            const key = column.toLowerCase();
            return <section className={`application-column column-${key}`} key={column} aria-label={`${column}, ${items.length}`}>
              <div className="application-column-header">
                <span className="application-column-dot" aria-hidden="true" />
                <strong>{column}</strong>
                <span className="application-count">{items.length}</span>
              </div>
              {items.length ? items.map(renderCard) : <p className="application-empty">Nothing here yet</p>}
            </section>;
          })}
      </section>

      <form className="product-card admin-job-form" ref={formRef} onSubmit={save} noValidate aria-labelledby="admin-job-form-title">
        <div className="product-card-header">
          <div>
            <h2 id="admin-job-form-title">{isNew ? "Add a job" : "Edit job"}</h2>
            <p>{isNew ? "It goes live as soon as you add it, unless you hide it." : `Editing ${editingJob?.title || form.title || "this job"}. Only the fields you change are saved.`}</p>
          </div>
        </div>

        {jobRemoved && <div className="product-error admin-job-removed" role="alert">
          <AlertCircle size={16} aria-hidden="true" />
          <span>This job was removed. It may have been deleted by another admin.</span>
          <div className="admin-job-removed-actions">
            <button type="button" className="product-button compact" onClick={() => setEditingId(null)}>Add as new</button>
            <button type="button" className="product-button compact" onClick={startNew}>Cancel</button>
          </div>
        </div>}

        {formError && <div className="product-error admin-job-form-error" role="alert"><AlertCircle size={16} aria-hidden="true" /><span>{formError}</span></div>}

        <div className="product-form-grid">
          <label className="product-field full">
            Job title
            <input ref={titleRef} className="product-input" value={form.title} onChange={setField("title")} required autoComplete="off" />
          </label>
          <label className="product-field">
            Company
            <input className="product-input" value={form.company} onChange={setField("company")} required autoComplete="off" />
          </label>
          <label className="product-field">
            Location
            <input className="product-input" value={form.location} onChange={setField("location")} required aria-describedby="admin-job-location-hint" autoComplete="off" />
            <span className="field-hint" id="admin-job-location-hint">A place in Canada, like Brampton, ON.</span>
          </label>
          <label className="product-field">
            Job type
            <select className="product-input" value={form.type} onChange={setField("type")}>
              <option value="">Not set</option>
              {JOB_TYPES.map((type) => <option key={type}>{type}</option>)}
              {form.type && !JOB_TYPES.includes(form.type) && <option>{form.type}</option>}
            </select>
          </label>
          <label className="product-field">
            Apply link
            <input className="product-input" type="url" inputMode="url" value={form.url} onChange={setField("url")} placeholder="https://" aria-describedby="admin-job-url-hint" autoComplete="off" />
            <span className="field-hint" id="admin-job-url-hint">Must start with https://</span>
          </label>
          <label className="product-field">
            Lowest salary
            <input className="product-input" type="number" inputMode="numeric" min="0" step="1" value={form.salaryMin} onChange={setField("salaryMin")} aria-describedby="admin-job-salary-hint" />
          </label>
          <label className="product-field">
            Highest salary
            <input className="product-input" type="number" inputMode="numeric" min="0" step="1" value={form.salaryMax} onChange={setField("salaryMax")} aria-describedby="admin-job-salary-hint" />
          </label>
          <p className="field-hint full admin-job-hint-row" id="admin-job-salary-hint">Whole dollars a year. Leave both blank if the pay is not shared.</p>
          <label className="product-field full">
            Description
            <textarea className="product-textarea" rows={6} value={form.description} onChange={setField("description")} aria-describedby="admin-job-description-hint" />
            <span className="field-hint" id="admin-job-description-hint">Plain text. Line breaks are kept.</span>
          </label>
          <label className="product-field full">
            Tags
            <input className="product-input" value={form.tags} onChange={setField("tags")} placeholder="Healthcare, Weekends" aria-describedby="admin-job-tags-hint" autoComplete="off" />
            <span className="field-hint" id="admin-job-tags-hint">Up to {MAX_TAGS}, separated by commas.</span>
          </label>
          <label className="product-field">
            Show until
            <input className="product-input" type="date" value={form.expiresAt} onChange={setField("expiresAt")} disabled={form.neverExpires} aria-describedby="admin-job-expiry-hint" />
            <span className="field-hint" id="admin-job-expiry-hint">{expiryHint(form)}</span>
          </label>
          <div className="admin-job-options">
            <label className="product-checkbox">
              <input type="checkbox" checked={form.neverExpires} onChange={setField("neverExpires")} />
              <span><strong>Never expires</strong><span>Keep it up until you hide or delete it.</span></span>
            </label>
            <label className="product-checkbox">
              <input type="checkbox" checked={form.hidden} onChange={setField("hidden")} />
              <span><strong>Hide from job seekers</strong><span>Only admins can see a hidden job.</span></span>
            </label>
          </div>
        </div>

        <div className="product-form-actions">
          <button type="submit" className="product-button primary" disabled={!canSave}>
            {saving ? "Saving..." : isNew ? "Add job" : "Save changes"}
          </button>
          {!isNew && <button type="button" className="product-button" onClick={startNew} disabled={saving}>Cancel</button>}
          {(loading || loadError) && <span className="field-hint admin-job-save-hint">You can save once the job list has loaded.</span>}
        </div>
      </form>
    </div>
  </div>;
}
