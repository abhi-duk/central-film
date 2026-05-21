import Link from 'next/link';
import { ensureCentralSchemaAndSeed } from '../../../lib/bootstrap';
import { getDb, rows } from '../../../lib/db';
import { safeJson } from '../../../lib/show';

export const dynamic = 'force-dynamic';

export default async function TicketPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  await ensureCentralSchemaAndSeed();
  const db = getDb();
  const [bookingRows] = await db.query(`SELECT * FROM central_bookings WHERE booking_id=? LIMIT 1`, [bookingId]);
  const b: any = rows<any>(bookingRows)[0];
  if (!b) return <main className="p-6">Booking not found</main>;
  const seats = safeJson<string[]>(b.seats_json, []);
  const pricing = safeJson<any>(b.pricing_json, null);
  const qr = encodeURIComponent(`${b.ticket_number}|${b.movie_title}|${seats.join(',')}`);
  return <main className="ticket-shell"><div className="hero-card"><div><div className="eyebrow">Central ticket issued</div><h1 className="page-title">Print or issue next ticket</h1></div><div className="ticket-actions"><Link href={`/book/show/${b.show_id}`} className="btn btn-secondary">Book another ticket</Link><button className="btn btn-primary" id="print-ticket-btn">Print ticket</button></div></div><div className="ticket-print"><div className="ticket-receipt"><div style={{textAlign:'center',fontWeight:'bold'}}>KSFDC CENTRAL TICKET</div><div className="ticket-admit">ADMIT : {seats.length}</div><div className="ticket-big">{b.movie_title}</div><div>{b.theatre_name}</div><hr/><div><strong>Show:</strong> {new Date(`${b.show_time_utc}Z`).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})}</div><div><strong>Seats:</strong> {seats.join(', ')}</div><div><strong>Ticket No:</strong> {b.ticket_number}</div><div><strong>Source:</strong> {b.booking_source}</div><div><strong>Payment:</strong> {b.payment_mode || '—'}</div><div><strong>Total:</strong> ₹{Number(pricing?.total || 0).toFixed(2)}</div><div className="qr-wrap"><img alt="QR" src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${qr}`} width="140" height="140"/></div></div></div><script dangerouslySetInnerHTML={{__html:`document.getElementById('print-ticket-btn')?.addEventListener('click',()=>window.print())`}} /></main>;
}
