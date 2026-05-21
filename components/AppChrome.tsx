'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ConnectionBanner } from './ConnectionBanner';
const themes = [{key:'ocean',label:'Ocean'},{key:'emerald',label:'Emerald'},{key:'violet',label:'Violet'},{key:'charcoal',label:'Charcoal'}];
function NavLink({ href, label, icon, collapsed }: any) { const path=usePathname(); const active=path===href || (href !== '/' && path?.startsWith(href)); return <Link href={href} className={`nav-link ${active?'nav-link-active':''}`}>{icon}<span className={collapsed?'hidden':''}>{label}</span></Link>; }
export default function AppChrome({ children, title='Central Ticketing', status='CENTRAL' }: { children: React.ReactNode; title?: string; status?: string }) {
  const [collapsed,setCollapsed]=useState(false); const [theme,setTheme]=useState('ocean');
  useEffect(()=>{ const saved=localStorage.getItem('central-theme')||'ocean'; setTheme(saved); document.documentElement.dataset.theme=saved; },[]);
  const changeTheme=(v:string)=>{setTheme(v); localStorage.setItem('central-theme',v); document.documentElement.dataset.theme=v;};
  return <div className="app-shell"><aside className={`sidebar ${collapsed?'sidebar-collapsed':''}`}><div className="brand-row"><div className="brand-badge">🎟</div>{!collapsed&&<div><div className="brand-title">Central Suite</div><div className="brand-sub">{title}</div></div>}<button className="icon-btn ml-auto" onClick={()=>setCollapsed(v=>!v)}>{collapsed?'»':'«'}</button></div><ConnectionBanner/><nav className="nav-stack"><NavLink href="/" label="Dashboard" icon="🏠" collapsed={collapsed}/><NavLink href="/book" label="Book Online" icon="🎫" collapsed={collapsed}/><NavLink href="/reports" label="Reports" icon="📊" collapsed={collapsed}/><NavLink href="/policies" label="Policies" icon="⚙️" collapsed={collapsed}/></nav></aside><div className="shell-content"><header className="topbar"><div><div className="eyebrow">{status}</div><div className="topbar-title">{title}</div></div><div className="topbar-actions"><label className="theme-switcher"><span>Theme</span><select value={theme} onChange={e=>changeTheme(e.target.value)}>{themes.map(t=><option key={t.key} value={t.key}>{t.label}</option>)}</select></label></div></header><div className="page-wrap">{children}</div></div></div>;
}
