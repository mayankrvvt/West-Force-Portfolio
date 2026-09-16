import { useEffect, useState } from "react";
import { Award, ExternalLink } from "lucide-react";
import { getMockCertificates } from "../../services/mockApi";

export default function Certificates() {
  const [certificates, setCertificates] = useState([]);
  useEffect(() => { getMockCertificates().then(setCertificates); }, []);

  return <div className="dashboard-product">
    <header className="product-page-header"><div><span className="product-eyebrow">CAREER</span><h1>Certificates</h1><p>Keep your professional credentials visible and ready to reference.</p></div></header>
    <div className="product-notice"><Award size={15}/><span>Certificate data is currently supplied by a demo API. Connect it to your MongoDB Certificate collection when the backend model is ready.</span></div>
    <section className="product-card"><div className="product-card-header"><div><h2>Your credentials</h2><p>{certificates.length} demo certificates</p></div></div><div className="product-quick-grid">{certificates.map((certificate) => <article className="product-card" style={{margin:0}} key={certificate.id}><div className="product-stat-icon"><Award size={18}/></div><h3 style={{margin:"14px 0 5px",color:"#17344e"}}>{certificate.title}</h3><p style={{margin:0,fontSize:11,color:"#7e91a4"}}>{certificate.issuer}</p><p style={{margin:"7px 0 14px",fontSize:10,color:"#99a7b5"}}>Issued {certificate.year} · {certificate.credential}</p><button className="product-button"><ExternalLink size={13}/> View credential</button></article>)}</div></section>
  </div>;
}
