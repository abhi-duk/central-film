import Link from 'next/link';
import { readMysqlStore } from '../../../lib/store';

export default async function TicketPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  const store = await readMysqlStore();
  const booking:any = store.bookings.find((b:any) => b.bookingId === bookingId);
  if (!booking) return <main className="p-8">Booking not found</main>;
  const displayTime = new Date(booking.showTimeUtc).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const admit = booking.totalTickets;
  const qr = encodeURIComponent(`${booking.ticketNumber}|${booking.movieTitle}|${booking.seats.join(',')}`);
  return <main className="ticket-shell"><div className="hero-card"><div><div className="eyebrow">Ticket issued</div><h1 className="page-title">Booking confirmed</h1><p className="page-subtitle">Keep this ticket ready for scanning at entry.</p></div><div className="ticket-actions"><Link href={`/book?showId=${booking.showId}`} className="btn btn-secondary">Book another for same show</Link><button className="btn btn-primary" id="print-ticket-btn">Print ticket</button></div></div><div className="ticket-print"><div className="ticket-receipt"><div style={{textAlign:'center',fontWeight:'bold'}}>KSFDC ONLINE TICKET</div><div className="ticket-admit">ADMIT : {admit}</div><div className="ticket-big">{booking.movieTitle}</div><div>{booking.theatreName}</div><hr /><div><strong>Show:</strong> {displayTime}</div><div><strong>Seats:</strong> {booking.seats.join(', ')}</div><div><strong>Ticket No:</strong> {booking.ticketNumber}</div><div><strong>Source:</strong> {booking.bookingSource}</div><div><strong>Printed From:</strong> {booking.printIp || booking.requestIp || '—'}</div><div><strong>Payment Mode:</strong> {booking.paymentMode || '—'}</div><div className="qr-wrap"><img alt="QR" src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${qr}`} width="140" height="140" /></div></div></div><script dangerouslySetInnerHTML={{__html:`document.getElementById('print-ticket-btn')?.addEventListener('click',()=>window.print())`}} /></main>;
}
