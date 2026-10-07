import { useEffect, useState } from "react";
import { Save, UserRound } from "lucide-react";
import { apiRequest } from "../../utils/api";

export default function Profile() {
  const [form, setForm] = useState({ name:"", title:"", location:"", email:"", phone:"" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => { apiRequest("/api/portfolios/me").then((r) => { const p=r?.portfolio||r?.data||r; setForm({name:p?.profile?.name||"",title:p?.profile?.title||"",location:p?.profile?.location||"",email:p?.profile?.email||"",phone:p?.profile?.phone||""}); }).catch(()=>{}).finally(()=>setLoading(false)); }, []);
  const change = (e) => setForm((v)=>({...v,[e.target.name]:e.target.value}));
  const save = async () => { setSaving(true); try { await apiRequest("/api/portfolios/me",{method:"PUT",body:JSON.stringify({profile:form})}); setMessage("Profile saved successfully."); } catch(e) { setMessage(e.message||"Could not save profile."); } finally { setSaving(false); setTimeout(()=>setMessage(""),2500); } };

  return <div className="dashboard-product"><header className="product-page-header"><div><span className="product-eyebrow">ACCOUNT</span><h1>Profile</h1><p>Your profile information powers the portfolio, resume builder and dashboard identity.</p></div></header>{message&&<div className="product-notice"><UserRound size={15}/><span>{message}</span></div>}<section className="product-card"><div className="product-card-header"><div><h2>Professional profile</h2><p>These fields are stored with your portfolio in MongoDB.</p></div><div className="product-stat-icon"><UserRound size={18}/></div></div>{loading?<div className="empty-product">Loading profile...</div>:<><div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:14}}>{[["name","Full name"],["title","Professional title"],["location","Location"],["email","Email"],["phone","Phone"]].map(([name,label])=><div className="product-field" key={name}><label>{label}</label><input className="product-input" name={name} value={form[name]} onChange={change} placeholder={label}/></div>)}</div><button className="product-button primary" disabled={saving} onClick={save}><Save size={14}/>{saving?"Saving...":"Save Profile"}</button></>}</section></div>;
}
