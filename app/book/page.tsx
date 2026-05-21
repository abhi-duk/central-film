import Link from 'next/link';
import AppChrome from '../../components/AppChrome';
import { ensureCentralSchemaAndSeed } from '../../lib/bootstrap';
import { getDb, rows } from '../../lib/db';

export const dynamic = 'force-dynamic';
export default async function BookPage() {
  await ensureCentralSchemaAndSeed();
  const db = getDb();
  const [showRows] = await db.query(`SELECT * FROM shows ORDER BY show_time_utc`);
  const shows: any[] = rows<any>(showRows);
  return <AppChrome title="Central Online Booking" status="ONLINE MODULE"><div className="hero-card"><div><div className="eyebrow">Select show</div><h1 className="page-title">Central online ticket booking</h1><p className="page-subtitle">When local theatre heartbeat is healthy, central online booking is paused. When local times out and fallback policy is enabled, these pages can book seats.</p></div></div><div className="show-grid mt-6">{shows.map(show => <Link key={show.show_id} href={`/book/show/${show.show_id}`} className="show-card"><div className="kicker">{show.screen_name}</div><div className="mt-3 text-2xl font-black">{show.movie_title}</div><div className="mt-2 mini-note">{show.theatre_name}</div><div className="mt-3 badge">{new Date(`${show.show_time_utc}Z`).toLocaleString('en-IN', { timeZone:'Asia/Kolkata' })}</div></Link>)}</div></AppChrome>;
}
