import { useRef, useState } from "react";
import {
  Award,
  BadgeCheck,
  BriefcaseBusiness,
  CircleCheck,
  FileText,
  GraduationCap,
  HeartPulse,
  School,
  ShieldCheck,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { formatDate } from "../../utils/formatDate";
import { formatFileSize } from "../../utils/formatFileSize";

// These keys only live in this browser (localStorage); the server never sees
// them. "school", "bachelor", "experience" and "training" are kept from the
// old list so files people already added still show up.
const DOCUMENT_TYPES = [
  { id: "school", title: "High school diploma", description: "Your Ontario Secondary School Diploma or the one from your province.", icon: School },
  { id: "bachelor", title: "College or university diploma", description: "Diploma, degree or transcript from a college or university.", icon: GraduationCap },
  { id: "licence", title: "Professional licence or registration", description: "Proof you are licensed or registered with a regulatory body.", icon: BadgeCheck },
  { id: "police-check", title: "Police check", description: "Criminal record check or vulnerable sector check.", icon: ShieldCheck },
  { id: "first-aid", title: "First aid and CPR", description: "Standard first aid, CPR or BLS certificate that is still valid.", icon: HeartPulse },
  { id: "training", title: "Training certificates", description: "Courses, workshops and safety training such as WHMIS.", icon: Award },
  { id: "experience", title: "Work experience letters", description: "Letters from past employers that confirm your role and dates.", icon: BriefcaseBusiness },
  { id: "references", title: "References", description: "Names and contact details of people who can speak to your work.", icon: Users },
];

const STORAGE_KEY = "westforce_documents";

function readDocuments() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeDocuments(documents) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
  } catch {
    /* Storage can be blocked (private mode); the list still works for this visit. */
  }
}

export default function Documents() {
  const [documents, setDocuments] = useState(readDocuments);
  const [activeUpload, setActiveUpload] = useState(null);
  const inputRef = useRef(null);

  const handleUploadClick = (documentId) => {
    setActiveUpload(documentId);
    setTimeout(() => inputRef.current?.click(), 0);
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file || !activeUpload) return;

    const updated = {
      ...documents,
      [activeUpload]: { name: file.name, size: file.size, type: file.type, uploadedAt: new Date().toISOString() },
    };
    setDocuments(updated);
    writeDocuments(updated);
    event.target.value = "";
    setActiveUpload(null);
  };

  const handleRemove = (documentId) => {
    const updated = { ...documents };
    delete updated[documentId];
    setDocuments(updated);
    writeDocuments(updated);
  };

  const uploadedCount = DOCUMENT_TYPES.filter((type) => documents[type.id]).length;
  const percent = Math.round((uploadedCount / DOCUMENT_TYPES.length) * 100);

  return (
    <div className="dashboard-product documents-page">
      <header className="product-page-header">
        <div>
          <h1>Documents</h1>
          <p>Keep the documents Canadian employers often ask for in one place, ready when you apply.</p>
        </div>
        <div className="documents-progress">
          <span><strong>{uploadedCount} of {DOCUMENT_TYPES.length}</strong> added</span>
          <div className="progress-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label="Documents added">
            <span style={{ transform: `scaleX(${percent / 100})` }} />
          </div>
        </div>
      </header>

      {uploadedCount === 0 && (
        <div className="product-notice">
          <Upload size={16} aria-hidden="true" />
          <span>Start with the document an employer asked for, or your highest diploma.</span>
        </div>
      )}

      <ul className="document-list">
        {DOCUMENT_TYPES.map((type) => {
          const Icon = type.icon;
          const uploaded = documents[type.id];
          return (
            <li className={`document-row ${uploaded ? "uploaded" : ""}`} key={type.id}>
              <span className="document-row-icon"><Icon size={18} aria-hidden="true" /></span>
              <div className="document-row-copy">
                <h2>{type.title}</h2>
                {uploaded ? (
                  <p className="document-row-file">
                    <FileText size={13} aria-hidden="true" />
                    <span className="document-row-name">{uploaded.name}</span>
                    <span className="document-row-detail">{formatFileSize(uploaded.size)}{uploaded.uploadedAt && `, ${formatDate(uploaded.uploadedAt)}`}</span>
                  </p>
                ) : (
                  <p>{type.description}</p>
                )}
              </div>
              <div className="document-row-side">
                {uploaded
                  ? <span className="document-row-status done"><CircleCheck size={13} aria-hidden="true" />Uploaded</span>
                  : <span className="document-row-status">Not yet</span>}
                <div className="document-row-actions">
                  {uploaded ? (
                    <>
                      <button type="button" className="product-button compact" onClick={() => handleUploadClick(type.id)} aria-label={`Replace ${type.title}`}>Replace</button>
                      <button type="button" className="icon-button danger" onClick={() => handleRemove(type.id)} aria-label={`Remove ${type.title}`} title="Remove"><Trash2 size={15} aria-hidden="true" /></button>
                    </>
                  ) : (
                    <button type="button" className="product-button compact" onClick={() => handleUploadClick(type.id)} aria-label={`Upload ${type.title}`}><Upload size={14} aria-hidden="true" />Upload</button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} hidden />

      <aside className="product-tip">
        <ShieldCheck size={18} aria-hidden="true" />
        <div>
          <strong>Where your files go</strong>
          <p>This page keeps a list of the files you picked on this device only. To show documents to employers, add them to your portfolio.</p>
        </div>
      </aside>
    </div>
  );
}
