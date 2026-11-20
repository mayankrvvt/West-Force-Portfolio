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
    <header className="product-page-header"><div><span className="product-eyebrow">CAREER</span><h1>Certificates</h1><p>The certificates you uploaded to your portfolio documents.</p></div></header>
    {error && <div className="product-notice" role="alert"><AlertCircle size={15}/><span>{error}</span></div>}
    <section className="product-card"><div className="product-card-header"><div><h2>Your certificates</h2><p>{loading ? "Loading..." : `${certificates.length} certificate${certificates.length === 1 ? "" : "s"}`}</p></div></div>
      {loading ? <div className="empty-product">Loading certificates...</div>
        : !certificates.length ? !error && <div className="empty-product"><Award size={28}/><h2>No certificates yet</h2><p>Upload certificates in your portfolio documents and set their type to "Certificate".</p><button className="product-button primary" onClick={() => navigate("/dashboard/documents")}>Go to documents</button></div>
        : <div className="product-quick-grid">{certificates.map((certificate) => <article className="product-card" style={{margin:0}} key={certificate._id}><div className="product-stat-icon"><Award size={18}/></div><h3 style={{margin:"14px 0 5px",color:"#17344e"}}>{certificate.name || "Certificate"}</h3><p style={{margin:"0 0 14px",fontSize:10,color:"#99a7b5"}}>{[certificate.format?.toUpperCase(), certificate.protected ? "PIN protected" : "Public"].filter(Boolean).join(" · ")}</p>{certificate.fileUrl && <a className="product-button" href={certificate.fileUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={13}/> Open file</a>}</article>)}</div>}
    </section>
  </div>;
}
