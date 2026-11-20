import { useEffect, useState } from "react";
import { AlertCircle, Award, ExternalLink, Eye, Globe2, Lightbulb, Lock, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../utils/api";
import { formatDate } from "../../utils/formatDate";
import { formatFileSize } from "../../utils/formatFileSize";
import PageSkeleton from "../../components/dashboard/Skeleton";

// Certificates are portfolio documents with the type "Certificate".
// They are added in the portfolio editor's Documents step.
const EDITOR_PATH = "/onboarding/create-portfolio";
const CERTIFICATE_STEPS = [
  "Open the portfolio editor",
  "Go to Documents and upload the file",
  "Set its type to Certificate",
];

export default function Certificates() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest("/api/portfolios/me/documents?type=certificate")
      .then((result) => setCertificates(result.documents || []))
      .catch((err) => setError(err.status === 404 ? "" : err.message || "Could not load certificates."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="dashboard-product"><PageSkeleton layout="grid" label="Loading certificates" /></div>;

  return <div className="dashboard-product">
    <header className="product-page-header">
      <div><h1>Certificates</h1><p>Licences, courses and training you added to your portfolio.</p></div>
      <Link className="product-button primary" to={EDITOR_PATH}><Plus size={16} aria-hidden="true"/> Add certificate</Link>
    </header>
    {error && <div className="product-error" role="alert"><AlertCircle size={16} aria-hidden="true"/><span>{error}</span></div>}
    {!certificates.length ? !error && <div className="empty-product">
      <span className="empty-product-icon"><Award size={22} aria-hidden="true"/></span>
      <h2>Nothing here yet</h2>
      <p>Certificates come from your portfolio. Adding one takes three steps.</p>
      <ol className="certificate-steps">
        {CERTIFICATE_STEPS.map((step, index) => <li key={step}><span className="certificate-step-number" aria-hidden="true">{index + 1}</span><span>{step}</span></li>)}
      </ol>
      <Link className="product-button primary" to={EDITOR_PATH}>Add your first certificate</Link>
    </div>
      : <section aria-labelledby="certificates-title" className="product-section">
        <div className="product-section-head"><h2 id="certificates-title">Your certificates</h2><span className="application-count">{certificates.length}</span></div>
        <ul className="certificate-grid">{certificates.map((certificate) => {
          const added = formatDate(certificate.uploadedAt || certificate.createdAt);
          const details = [certificate.format?.toUpperCase(), certificate.size ? formatFileSize(certificate.size) : "", added && `Added ${added}`].filter(Boolean);
          return <li className="certificate-card" key={certificate._id}>
            <div className="certificate-card-top">
              <span className="product-object-icon"><Award size={18} aria-hidden="true"/></span>
              {certificate.protected
                ? <span className="seal-badge"><Lock size={12} aria-hidden="true"/>PIN protected</span>
                : <span className="status-badge"><Globe2 size={12} aria-hidden="true"/>Public</span>}
            </div>
            <h3>{certificate.name || "Certificate"}</h3>
            {details.length > 0 && <p className="certificate-details">{details.join(", ")}</p>}
            <div className="certificate-card-actions">
              {certificate.fileUrl
                ? <a className="product-button compact" href={certificate.fileUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} aria-hidden="true"/> Open file</a>
                : <Link className="product-button compact" to="/dashboard/portfolio"><Eye size={14} aria-hidden="true"/> View in portfolio</Link>}
            </div>
          </li>;
        })}
          <li className="certificate-add">
            <Link to={EDITOR_PATH}><Plus size={16} aria-hidden="true"/> Add another certificate</Link>
          </li>
        </ul>
      </section>}
    <aside className="product-tip">
      <Lightbulb size={18} aria-hidden="true"/>
      <div>
        <strong>Make them easy to trust</strong>
        <p>Use the full name of each certificate, like “Standard first aid and CPR level C”. Protected files open only for people you give your PIN to.</p>
      </div>
    </aside>
  </div>;
}
