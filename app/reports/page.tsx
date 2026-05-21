import AppChrome from '../../components/AppChrome';
import { ensureCentralSchemaAndSeed } from '../../lib/bootstrap';
import { getDb, rows } from '../../lib/db';
import { safeJson } from '../../lib/show';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  await ensureCentralSchemaAndSeed();
  const db = getDb();
  const [bookRows] = await db.query(`SELECT * FROM central_bookings ORDER BY created_at_utc DESC LIMIT 100`);
  const bookings: any[] = rows<any>(bookRows);
  const [payRows] = await db.query(`SELECT * FROM payment_transactions ORDER BY created_at_utc DESC LIMIT 100`);
  const payments: any[] = rows<any>(payRows);
  const confirmed = bookings.filter(b => b.booking_status === 'CONFIRMED').length;
  const local = bookings.filter(b => String(b.booking_source).startsWith('LOCAL')).length;
  const pendingPayments = payments.filter(p => p.transaction_state === 'PENDING_CONFIRMATION').length;
  const tickets = bookings.reduce((s,b)=>s+Number(b.total_tickets||0),0);
  return <AppChrome title="Reports & Reconciliation" status="CENTRAL"><div className="grid-cards stats-4"><div className="stat-card"><div className="stat-label">Confirmed bookings</div><div className="stat-value">{confirmed}</div></div><div className="stat-card"><div className="stat-label">Tickets</div><div className="stat-value">{tickets}</div></div><div className="stat-card"><div className="stat-label">Local synced</div><div className="stat-value">{local}</div></div><div className="stat-card"><div className="stat-label">Pending payments</div><div className="stat-value">{pendingPayments}</div></div></div><div className="table-card mt-6"><table><thead><tr><th>Ticket</th><th>Movie</th><th>Seats</th><th>Source</th><th>Status</th><th>Confirmed</th></tr></thead><tbody>{bookings.map(b => { const seats=safeJson<string[]>(b.seats_json,[]); return <tr key={b.booking_id}><td>{b.ticket_number}</td><td>{b.movie_title}</td><td>{seats.join(', ')}</td><td>{b.booking_source}</td><td>{b.reconciliation_status}</td><td>{new Date(`${b.confirmed_at_utc}Z`).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})}</td></tr>; })}</tbody></table></div></AppChrome>;
}
