'use client';
import { useEffect, useState } from 'react';
import AppChrome from '../../components/AppChrome';

export const dynamic = 'force-dynamic';

export default function PoliciesPage() {
  const [form,setForm]=useState({holdSeconds:90,heartbeatTimeoutSeconds:30,allowCentralWhenLocalOffline:true,blockOnlineWhenLocalLive:true});
  const [message,setMessage]=useState('');
  useEffect(()=>{ fetch('/api/health',{cache:'no-store'}).catch(()=>{}); },[]);
  const save=async()=>{ setMessage('Saving…'); const res=await fetch('/api/policies',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)}); const data=await res.json().catch(()=>null); setMessage(data?.success?'Policy saved':'Could not save policy'); };
  return <AppChrome title="Policy Configuration" status="CENTRAL"><div className="hero-card"><div><div className="eyebrow">Booking rules</div><h1 className="page-title">Authority and hold policy</h1><p className="page-subtitle">These values control when central can take over and how long online seat holds stay active.</p></div></div><div className="panel-card p-6 mt-6"><div className="form-grid"><label><div className="stat-label">Hold seconds</div><input className="input mt-2" type="number" value={form.holdSeconds} onChange={e=>setForm({...form,holdSeconds:Number(e.target.value)})}/></label><label><div className="stat-label">Heartbeat timeout seconds</div><input className="input mt-2" type="number" value={form.heartbeatTimeoutSeconds} onChange={e=>setForm({...form,heartbeatTimeoutSeconds:Number(e.target.value)})}/></label><label className="seat-pill mt-6"><input type="checkbox" checked={form.allowCentralWhenLocalOffline} onChange={e=>setForm({...form,allowCentralWhenLocalOffline:e.target.checked})}/> Allow central when local offline</label><label className="seat-pill mt-6"><input type="checkbox" checked={form.blockOnlineWhenLocalLive} onChange={e=>setForm({...form,blockOnlineWhenLocalLive:e.target.checked})}/> Block online when local live</label></div><div className="mt-6 flex gap-3"><button className="btn btn-primary" onClick={save}>Save Policy</button><span className="mini-note">{message}</span></div></div></AppChrome>;
}
