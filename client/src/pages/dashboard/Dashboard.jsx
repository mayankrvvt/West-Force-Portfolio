import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  FileCheck2,
  ScanSearch,
  Sparkles,
  UserRound,
} from "lucide-react";
import { apiRequest } from "../../utils/api";
import { getMockDashboardData } from "../../services/mockApi";

export default function Dashboard() {
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [portfolioResult, mockResult] = await Promise.all([
          apiRequest("/api/portfolios/me").catch(() => null),
          getMockDashboardData(),
        ]);
        if (cancelled) return;
        setPortfolio(portfolioResult?.portfolio || portfolioResult?.data || portfolioResult || null);
        setData(mockResult);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="dashboard-product"><div className="empty-product">Loading your workspace...</div></div>;

  const name = portfolio?.profile?.name || "there";
  const slug = portfolio?.slug;

  return (
    <div className="dashboard-product">
      <section className="dashboard-welcome product-welcome">
        <div>
          <p className="dashboard-eyebrow">YOUR CAREER WORKSPACE</p>
          <h2>Good to see you, <span>{name}</span> 👋</h2>
          <p>Build your portfolio, improve your resume, check ATS compatibility and keep your job search organized in one place.</p>
        </div>
        <div className="product-inline-actions">
          <button className="product-button primary" onClick={() => navigate("/dashboard/resume-builder")}><Sparkles size={15}/> Improve Resume</button>
        </div>
      </section>

      <div className="product-stat-grid">
        <Stat icon={BriefcaseBusiness} label="Portfolio completion" value={`${data?.portfolioCompletion || 0}%`} />
        <Stat icon={FileCheck2} label="Latest ATS score" value={`${data?.atsScore || 0}`} suffix="/100" />
        <Stat icon={FileCheck2} label="Resume versions" value={data?.resumeCount || 0} />
        <Stat icon={BriefcaseBusiness} label="Applications" value={data?.applicationCount || 0} />
      </div>

      <div className="product-dashboard-grid">
        <section className="product-card">
          <div className="product-card-header">
            <div><h2>Your professional portfolio</h2><p>Your live portfolio uses the Canadian template and your saved profile data.</p></div>
            <span className="product-eyebrow">{data?.published ? "PUBLISHED" : "DRAFT"}</span>
          </div>
          <div className="product-portfolio-preview">
            <div>
              <span className="product-eyebrow" style={{color:"#8bd6ff"}}>WESTFORCE PORTFOLIO</span>
              <h2>{portfolio?.profile?.title || "Your professional profile"}</h2>
              <p>{portfolio?.hero?.description || "Create a polished online presence that brings your experience, skills and documents together."}</p>
              <div className="product-inline-actions" style={{marginTop:22}}>
                <button className="product-button" onClick={() => navigate("/dashboard/portfolio")}>Open Portfolio <ArrowUpRight size={14}/></button>
                {slug && <a className="product-button" href={`/portfolio/${slug}`} target="_blank" rel="noreferrer">Public View</a>}
              </div>
            </div>
            <div className="product-preview-mark">WF</div>
          </div>
        </section>

        <section className="product-card">
          <div className="product-card-header"><div><h2>Quick actions</h2><p>Jump straight into your next career task.</p></div></div>
          <div className="product-quick-grid">
            <Quick icon={UserRound} title="Edit Profile" text="Update your details" onClick={() => navigate("/dashboard/profile")} />
            <Quick icon={Sparkles} title="AI Resume" text="Enhance a resume" onClick={() => navigate("/dashboard/resume-builder")} />
            <Quick icon={ScanSearch} title="Check ATS" text="Analyze job match" onClick={() => navigate("/dashboard/ats-checker")} />
            <Quick icon={BriefcaseBusiness} title="Find Jobs" text="Explore opportunities" onClick={() => navigate("/dashboard/jobs")} />
          </div>
        </section>
      </div>

      <section className="product-card" style={{marginTop:18}}>
        <div className="product-card-header"><div><h2>Recent activity</h2><p>A quick view of your latest career workspace activity.</p></div></div>
        <div className="product-activity-list">
          {(data?.activity || []).map((item) => (
            <div className="product-activity-item" key={item.id}><span className="activity-dot"/><div><strong>{item.title}</strong><p>{item.detail}</p></div><time>{item.time}</time></div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({icon: Icon,label,value,suffix}) {
  return <div className="product-stat"><div className="product-stat-top"><div className="product-stat-icon"><Icon size={18}/></div></div><div className="product-stat-label">{label}</div><div className="product-stat-value">{value} {suffix && <small>{suffix}</small>}</div></div>;
}

function Quick({icon: Icon,title,text,onClick}) {
  return <button className="product-quick-action" onClick={onClick}><Icon size={18}/><div><strong>{title}</strong><span>{text}</span></div></button>;
}
