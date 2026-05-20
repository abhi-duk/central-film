export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { markTimedOutTheatres, readMysqlStore } from '../lib/store';
import PageShell from '../components/PageShell';

export default async function HomePage() {
  await markTimedOutTheatres(Number(process.env.HEARTBEAT_TIMEOUT_SECONDS || 30));
  const store = await readMysqlStore();
  const theatre = store.theatres[0];
  const totalBookings = store.bookings.filter(b => b.bookingStatus === 'CONFIRMED').length;
  const totalTickets = store.bookings.filter(b => b.bookingStatus === 'CONFIRMED').reduce((sum,b)=>sum+b.totalTickets,0);
  const onlineBookings = store.bookings.filter(b => /ONLINE/.test(b.bookingSource)).length;
  const localMirrors = store.bookings.filter(b => /LOCAL/.test(b.bookingSource)).length;
  const recent = Array.from({length:7}).map((_,idx)=>{
    const date = new Date(); date.setDate(date.getDate() - (6-idx));
    const key = date.toISOString().slice(0,10);
    const count = store.bookings.filter(b => (b.createdAt || '').slice(0,10)===key).length;
    return { key, count };
  });
  const max = Math.max(1, ...recent.map(r=>r.count));
  return (
    <PageShell title="Operations dashboard" subtitle="Compact control view with theatre health, recovery, sync queue, and sales performance." actions={<><Link href="/book" className="btn btn-primary">Book New Ticket</Link><Link href="/policies" className="btn btn-secondary">Policy Settings</Link></>}>
      <div className="grid-cards stats-4">
        <div className="stat-card"><div className="stat-label">Connection State</div><div className="stat-value">{theatre.recoveryState}</div><div className="stat-help">Authority: {theatre.currentAuthority}</div></div>
        <div className="stat-card"><div className="stat-label">Pending Sync</div><div className="stat-value">{theatre.syncPendingCount}</div><div className="stat-help">Failed: {theatre.syncFailedCount} • Conflicts: {theatre.syncConflictCount}</div></div>
        <div className="stat-card"><div className="stat-label">Bookings</div><div className="stat-value">{totalBookings}</div><div className="stat-help">Tickets sold: {totalTickets}</div></div>
        <div className="stat-card"><div className="stat-label">Sales Mix</div><div className="stat-value">{onlineBookings}/{localMirrors}</div><div className="stat-help">Online / Local mirrored</div></div>
      </div>
      <div className="grid-cards stats-3">
        <div className="chart-card p-6"><div className="stat-label">Recovery & Sync</div><div className="mt-4 space-y-3 text-sm"><div className="summary-line"><span>Pending sync</span><strong>{theatre.syncPendingCount}</strong></div><div className="summary-line"><span>Synced / reconciled</span><strong>{theatre.syncSuccessCount}</strong></div><div className="summary-line"><span>Failed</span><strong>{theatre.syncFailedCount}</strong></div><div className="summary-line"><span>Last sync</span><strong>{theatre.lastSyncAt ? new Date(theatre.lastSyncAt).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'}) : '—'}</strong></div></div></div>
        <div className="chart-card p-6"><div className="stat-label">Sales Trend</div><div className="mt-6 space-y-3">{recent.map(r=><div key={r.key}><div className="summary-line"><span>{r.key}</span><strong>{r.count}</strong></div><div className="progress-bar"><div className="progress-fill" style={{width:`${(r.count/max)*100}%`}} /></div></div>)}</div></div>
        <div className="chart-card p-6"><div className="stat-label">Theatre Summary</div><div className="mt-4 text-xl font-bold">{theatre.name}</div><div className="mini-note mt-2">{theatre.city}</div><div className="mt-4 grid gap-3 text-sm"><div className="summary-line"><span>Working hours</span><strong>{theatre.workingHoursStart} - {theatre.workingHoursEnd}</strong></div><div className="summary-line"><span>Working-hour outage</span><strong>{theatre.outageModeWorkingHours}</strong></div><div className="summary-line"><span>Off-hour outage</span><strong>{theatre.outageModeOffHours}</strong></div></div></div>
      </div>
    </PageShell>
  );
}
