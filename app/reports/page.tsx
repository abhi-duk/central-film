export const dynamic = 'force-dynamic';
import PageShell from '../../components/PageShell';
import { readMysqlStore } from '../../lib/store';

export default async function ReportsPage() {
  const store = await readMysqlStore();
  const total = store.bookings.length;
  const confirmed = store.bookings.filter((b:any)=>b.bookingStatus==='CONFIRMED').length;
  const pendingRows = Array.isArray(store.pending) ? (store.pending as any[]) : [];
  const pending = pendingRows.filter((p:any)=>p.transaction_state==='PENDING_CONFIRMATION').length;
  return <PageShell title="Reports & reconciliation" subtitle="Compact booking, sync, and recovery visibility."><div className="grid-cards stats-3"><div className="stat-card"><div className="stat-label">All Bookings</div><div className="stat-value">{total}</div></div><div className="stat-card"><div className="stat-label">Confirmed</div><div className="stat-value">{confirmed}</div></div><div className="stat-card"><div className="stat-label">Pending</div><div className="stat-value">{pending}</div></div></div><div className="table-card mt-6"><table><thead><tr><th>Booking</th><th>Movie</th><th>Seats</th><th>Source</th><th>Status</th><th>Sync</th></tr></thead><tbody>{store.bookings.length===0?<tr><td colSpan={6}>No bookings yet</td></tr>:store.bookings.map((b:any)=><tr key={b.bookingId}><td>{b.ticketNumber}</td><td>{b.movieTitle}</td><td>{b.seats.join(', ')}</td><td>{b.bookingSource}</td><td>{b.bookingStatus}</td><td>{b.reconciliationStatus}</td></tr>)}</tbody></table></div></PageShell>;
}
