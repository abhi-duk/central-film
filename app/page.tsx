import Link from 'next/link';
import AppChrome from '../components/AppChrome';
import { ensureCentralSchemaAndSeed } from '../lib/bootstrap';
import { getDb, rows } from '../lib/db';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  await ensureCentralSchemaAndSeed();
  const db = getDb();
  const [showRows] = await db.query(`SELECT * FROM shows ORDER BY show_time_utc`);
  const shows: any[] = rows<any>(showRows);
  const [totalsRows] = await db.query(`SELECT COUNT(*) AS bookings, COALESCE(SUM(total_tickets),0) AS tickets FROM central_bookings`);
  const totals: any = rows<any>(totalsRows)[0];
  const [localRows] = await db.query(`SELECT COUNT(*) AS cnt FROM central_bookings WHERE booking_source LIKE 'LOCAL%'`);
  const local: any = rows<any>(localRows)[0];
  const [heartRows] = await db.query(`SELECT * FROM theatres LIMIT 1`);
  const theatre: any = rows<any>(heartRows)[0];
  return <AppChrome title="KSFDC Central Ticketing" status="CENTRAL"><div className="hero-card"><div><div className="eyebrow">Central control room</div><h1 className="page-title">Bookings, authority and reconciliation</h1><p className="page-subtitle">Central app aligned with the working local theatre server. Local heartbeat controls booking authority. Central fallback can take over only when policy allows it.</p></div><div className="hero-actions"><Link className="btn btn-primary" href="/book">Book Online</Link><Link className="btn btn-secondary" href="/reports">Reports</Link></div></div><div className="grid-cards stats-4 mt-4"><div className="stat-card"><div className="stat-label">Total bookings</div><div className="stat-value">{Number(totals?.bookings || 0)}</div></div><div className="stat-card"><div className="stat-label">Tickets sold</div><div className="stat-value">{Number(totals?.tickets || 0)}</div></div><div className="stat-card"><div className="stat-label">Local synced</div><div className="stat-value">{Number(local?.cnt || 0)}</div></div><div className="stat-card"><div className="stat-label">Last heartbeat</div><div className="stat-value text-xl">{theatre?.last_heartbeat_utc ? new Date(`${theatre.last_heartbeat_utc}Z`).toLocaleTimeString('en-IN', { timeZone:'Asia/Kolkata' }) : '—'}</div><div className="stat-help">{theatre?.theatre_id || 'Waiting for local theatre'}</div></div></div><div className="show-grid mt-6">{shows.map(show => <Link key={show.show_id} href={`/book/show/${show.show_id}`} className="show-card"><div className="kicker">{show.screen_name}</div><div className="mt-3 text-2xl font-black">{show.movie_title}</div><div className="mt-2 mini-note">{show.theatre_name}</div><div className="mt-3 badge">{new Date(`${show.show_time_utc}Z`).toLocaleString('en-IN', { timeZone:'Asia/Kolkata' })}</div></Link>)}</div></AppChrome>;
}
