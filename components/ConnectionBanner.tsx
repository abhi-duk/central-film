'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Health = { dbHealthy: boolean; authority: 'LOCAL'|'ONLINE'|'BLOCKED'; heartbeatHealthy: boolean; syncPendingCount?: number; message?: string };
const HealthContext = createContext<Health | null>(null);
function shortLabel(h: Health) { if (h.authority === 'LOCAL') return 'LOCAL LIVE'; if (h.authority === 'ONLINE') return 'CENTRAL LIVE'; return 'BLOCKED'; }
function message(h: Health) { return h.message || (h.authority === 'LOCAL' ? 'Local theatre is healthy. Online booking is paused to avoid double booking.' : h.authority === 'ONLINE' ? 'Local theatre heartbeat is not healthy. Central online booking can accept bookings.' : 'Booking is paused until policy or theatre health is restored.'); }
export function HealthProvider({children}:{children:React.ReactNode}){
 const [health,setHealth]=useState<Health|null>(null);
 useEffect(()=>{let active=true; const run=async()=>{try{const res=await fetch('/api/health',{cache:'no-store'}); const data=await res.json(); if(active&&data?.success) setHealth(data);}catch{}}; run(); const t=setInterval(run,10000); return()=>{active=false; clearInterval(t)};},[]);
 return <HealthContext.Provider value={health}>{children}</HealthContext.Provider>;
}
export function useHealth(){ return useContext(HealthContext); }
export function ConnectionBanner(){ const h=useHealth(); const tone=h ? (h.authority==='ONLINE'?'ok':h.authority==='LOCAL'?'warn':'bad') : 'warn'; return <div className={`status-card status-${tone}`}><div className={`status-led ${tone==='bad'?'blink':''}`} /><div className="min-w-0"><div className="status-title-sm">{h?shortLabel(h):'CHECKING'}</div><div className="status-copy">{h?message(h):'Checking central status…'}</div></div></div>; }
