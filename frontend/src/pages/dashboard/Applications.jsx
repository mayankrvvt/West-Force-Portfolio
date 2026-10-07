import { useEffect, useState } from "react";
import { BriefcaseBusiness, ExternalLink, RefreshCw } from "lucide-react";
import { getMockApplications, updateMockApplicationStatus } from "../../services/mockApi";

const COLUMNS = ["Saved", "Applied", "Interview", "Offer"];

export default function Applications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => { setLoading(true); try { setApplications(await getMockApplications()); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  const changeStatus = async (id, status) => {
    const updated = await updateMockApplicationStatus(id, status);
    setApplications((items) => items.map((item) => item.id === id ? updated : item));
  };

  return <div className="dashboard-product">
    <header className="product-page-header"><div><span className="product-eyebrow">CAREER</span><h1>Applications</h1><p>Track saved opportunities and move applications through your hiring pipeline.</p></div><button className="product-button" onClick={load}><RefreshCw size={14}/> Refresh</button></header>
    <div className="product-notice"><BriefcaseBusiness size={15}/><span>Application tracking is currently powered by a local demo API. Status changes persist in this browser.</span></div>
    {loading ? <div className="empty-product">Loading applications...</div> : <section className="product-card"><div className="application-board">{COLUMNS.map((column) => <div className="application-column" key={column}><div className="application-column-header"><strong>{column}</strong><span>{applications.filter((item) => item.status === column).length}</span></div>{applications.filter((item) => item.status === column).map((application) => <div className="application-card" key={application.id}><strong>{application.role}</strong><span>{application.company}</span><small>{application.location}</small><select className="application-status-select" value={application.status} onChange={(e) => changeStatus(application.id,e.target.value)}>{COLUMNS.map((status) => <option key={status}>{status}</option>)}</select>{application.appliedAt && <small>Updated {new Date(application.appliedAt).toLocaleDateString()}</small>}<a href="#" onClick={(e)=>e.preventDefault()} style={{display:"inline-flex",gap:4,marginTop:8,color:"#087fbe",fontSize:9,fontWeight:700}}>Job details <ExternalLink size={10}/></a></div>)}</div>)}</div></section>}
  </div>;
}
