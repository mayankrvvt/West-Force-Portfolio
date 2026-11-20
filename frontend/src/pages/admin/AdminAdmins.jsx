import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Lock, Trash2, UserPlus, Users } from "lucide-react";

import { addAdmin, listAdmins, removeAdmin } from "../../services/adminService";
import { formatDate } from "../../utils/formatDate";
import PageSkeleton from "../../components/dashboard/Skeleton";
import StatusBadge from "../../components/dashboard/StatusBadge";
import useIsAdmin from "../../hooks/useIsAdmin";
import usePageTitle from "../../hooks/usePageTitle";
import useFocusLater, { focusOnMount } from "../../hooks/useFocusLater";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AdminAdmins() {
  usePageTitle("Admins");
  const { isOwner } = useIsAdmin();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmEmail, setConfirmEmail] = useState(null);
  const [busyEmail, setBusyEmail] = useState(null);
  const [rowError, setRowError] = useState({ email: null, message: "" });
  const mountedRef = useRef(true);
  const headingRef = useRef(null);
  const listRef = useRef(null);
  const focusLater = useFocusLater();

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const list = await listAdmins();
      if (mountedRef.current) setAdmins(list);
    } catch (err) {
      if (mountedRef.current) setLoadError(err.message || "Could not load admins.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async (event) => {
    event.preventDefault();
    const value = email.trim().toLowerCase();
    setNotice("");
    if (!EMAIL_PATTERN.test(value)) {
      setFormError("Enter a full email address, like name@example.com.");
      return;
    }
    if (admins.some((admin) => admin.email === value)) {
      setFormError("That person is already an admin.");
      return;
    }
    setFormError("");
    setAdding(true);
    try {
      const admin = await addAdmin(value);
      if (!mountedRef.current) return;
      setAdmins((list) => [...list, admin || { email: value, owner: false, addedBy: null, createdAt: new Date().toISOString() }]);
      setEmail("");
      setNotice(`Added ${value}. They can use the admin pages the next time they sign in.`);
    } catch (err) {
      if (mountedRef.current) setFormError(err.message || "Could not add the admin.");
    } finally {
      if (mountedRef.current) setAdding(false);
    }
  };

  const remove = async (target) => {
    setBusyEmail(target);
    setRowError({ email: null, message: "" });
    setNotice("");
    try {
      await removeAdmin(target);
      if (!mountedRef.current) return;
      setAdmins((list) => list.filter((admin) => admin.email !== target));
      setConfirmEmail(null);
      setNotice(`Removed ${target}.`);
      focusLater(() => headingRef.current);
    } catch (err) {
      if (mountedRef.current) setRowError({ email: target, message: err.message || "Could not remove the admin." });
    } finally {
      if (mountedRef.current) setBusyEmail(null);
    }
  };

  const cancelRemove = (target) => {
    setConfirmEmail(null);
    // The remove button comes back on the next render; put focus on it again.
    focusLater(() => [...(listRef.current?.querySelectorAll("[data-remove-email]") || [])]
      .find((node) => node.dataset.removeEmail === target));
  };

  return <div className="dashboard-product">
    <header className="product-page-header">
      <div><h1 ref={headingRef} tabIndex={-1}>Admins</h1><p>People who can manage jobs, site settings and other admins.</p></div>
    </header>

    <div aria-live="polite">
      {notice && <div className="product-notice"><CheckCircle2 size={16} aria-hidden="true" /><span>{notice}</span></div>}
    </div>

    {!isOwner && <p className="admin-readonly-note"><Lock size={14} aria-hidden="true" />Only owners can add or remove admins.</p>}

    {isOwner && <form className="product-card admin-add-form" onSubmit={add} noValidate>
      <label className="product-field full" htmlFor="admin-add-email">Add admin</label>
      <div className="admin-add-row">
        <input
          id="admin-add-email"
          className="product-input"
          type="email"
          inputMode="email"
          autoComplete="off"
          placeholder="name@example.com"
          value={email}
          onChange={(event) => { setEmail(event.target.value); setFormError(""); }}
          aria-invalid={formError ? "true" : undefined}
          aria-describedby={formError ? "admin-add-error" : "admin-add-hint"}
        />
        <button type="submit" className="product-button primary" disabled={adding || loading || Boolean(loadError)}>
          <UserPlus size={16} aria-hidden="true" /> {adding ? "Adding..." : "Add admin"}
        </button>
      </div>
      {formError
        ? <div className="product-error" id="admin-add-error" role="alert"><AlertCircle size={14} aria-hidden="true" /><span>{formError}</span></div>
        : <span className="field-hint" id="admin-add-hint">They need a WestForce account with this email.</span>}
    </form>}

    <section className="product-card admin-list-card" aria-label="Admins">
      {loading ? <PageSkeleton layout="list" label="Loading admins" />
        : loadError ? <div className="empty-product" role="alert">
          <span className="empty-product-icon"><AlertCircle size={22} aria-hidden="true" /></span>
          <h2>Could not load admins</h2>
          <p>{loadError}</p>
          <button type="button" className="product-button primary" onClick={load}>Try again</button>
        </div>
        : !admins.length ? <div className="empty-product">
          <span className="empty-product-icon"><Users size={22} aria-hidden="true" /></span>
          <h2>Nothing here yet</h2>
          <p>Admins you add show up here.</p>
        </div>
        : <ul className="admin-list" ref={listRef}>
          {admins.map((admin) => {
            const confirming = confirmEmail === admin.email;
            const busy = busyEmail === admin.email;
            return <li className="admin-row" key={admin.email}>
              <div className="admin-row-main">
                <span className="application-card-avatar" aria-hidden="true">{admin.email.charAt(0)}</span>
                <div className="admin-row-copy">
                  <strong>{admin.email}</strong>
                  <small>{admin.owner ? "Set by the server, can't be removed" : [admin.addedBy && `Added by ${admin.addedBy}`, admin.createdAt && `on ${formatDate(admin.createdAt)}`].filter(Boolean).join(" ") || "Admin"}</small>
                </div>
                {admin.owner && <StatusBadge status="Owner" />}
                {isOwner && !admin.owner && !confirming && <button type="button" className="icon-button danger" title="Remove" aria-label={`Remove ${admin.email}`} data-remove-email={admin.email} onClick={() => { setConfirmEmail(admin.email); setRowError({ email: null, message: "" }); }}>
                  <Trash2 size={15} aria-hidden="true" />
                </button>}
              </div>
              {confirming && <div className="admin-row-confirm" role="group" aria-label={`Remove ${admin.email}?`}>
                <span>Remove this admin? They lose access within a minute.</span>
                <button type="button" className="product-button compact" ref={focusOnMount} onClick={() => cancelRemove(admin.email)} disabled={busy}>Cancel</button>
                <button type="button" className="product-button compact admin-job-delete" onClick={() => remove(admin.email)} disabled={busy}>{busy ? "Removing..." : "Remove"}</button>
              </div>}
              {rowError.email === admin.email && <div className="product-error" role="alert"><AlertCircle size={14} aria-hidden="true" /><span>{rowError.message}</span></div>}
            </li>;
          })}
        </ul>}
    </section>
  </div>;
}
