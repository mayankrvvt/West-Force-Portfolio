import { useEffect, useState } from "react";
import { AlertCircle, Award, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../utils/api";

export default function Certificates() {
  const navigate = useNavigate();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest("/api/portfolios/me/documents?type=certificate")
      .then((result) => setCertificates(result.documents || []))
      .catch((err) => setError(err.status === 404 ? "" : err.message || "Could not load certificates."))
      .finally(() => setLoading(false));
  }, []);

  return <div className="dashboard-product">
    <header className="product-page-header"><div><h1>Certificates</h1><p>The certificates you uploaded to your portfolio documents.</p></div></header>
    {error && <div className="product-notice" role="alert"><AlertCircle size={16} aria-hidden="true"/><span>{error}</span></div>}
    <section className="product-card"><div className="product-card-header"><div><h2>Your certificates</h2><p>{loading ? "Loading…" : `${certificates.length} certificate${certificates.length === 1 ? "" : "s"}`}</p></div></div>
      {loading ? <div className="empty-product">Loading certificates…</div>
        : !certificates.length ? !error && <div className="empty-product"><Award size={28} aria-hidden="true"/><h2>No certificates yet</h2><p>Upload a certificate in your documents and set its type to “Certificate”. It will show up here.</p><button className="product-button primary" onClick={() => navigate("/dashboard/documents")}>Go to documents</button></div>
        : <ul className="product-object-grid">{certificates.map((certificate) => <li className="product-object" key={certificate._id}><Award size={18} aria-hidden="true"/><h3>{certificate.name || "Certificate"}</h3><p className="product-meta">{certificate.format && <span>{certificate.format.toUpperCase()}</span>}<span>{certificate.protected ? "PIN protected" : "Public"}</span></p>{certificate.fileUrl && <a className="product-button" href={certificate.fileUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} aria-hidden="true"/> Open file</a>}</li>)}</ul>}
    </section>
  </div>;
}
