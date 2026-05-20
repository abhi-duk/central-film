import Link from 'next/link';
import { readMysqlStore } from '../../../lib/store';

function getShowSlot(date: Date) {
  const hour = date.getHours();
  if (hour < 12) return 'Morning Show';
  if (hour < 16) return 'Afternoon Show';
  if (hour < 19) return 'Evening Show';
  return 'Night Show';
}

function getDayBadge(date: Date) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diff = Math.round((target - today) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return date.toLocaleDateString('en-IN', { weekday: 'long' });
}

export default async function TicketPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  const store = await readMysqlStore();
  const booking:any = store.bookings.find((b:any) => b.bookingId === bookingId);
  if (!booking) return <main className="p-8">Booking not found</main>;
  const showDate = new Date(booking.showTimeUtc);
  const displayTime = showDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const dayBadge = getDayBadge(showDate);
  const showSlot = getShowSlot(showDate);
  const admit = booking.totalTickets;
  const qr = encodeURIComponent(`${booking.ticketNumber}|${booking.movieTitle}|${booking.seats.join(',')}|${displayTime}`);
  return <main className="ticket-shell print-page"><div className="hero-card print-hide"><div><div className="eyebrow">Ticket issued</div><h1 className="page-title">Booking confirmed</h1><p className="page-subtitle">Keep this ticket ready for entry scanning or checking.</p></div><div className="ticket-actions"><Link href={`/book?showId=${booking.showId}`} className="btn btn-secondary">Book another for same show</Link><button className="btn btn-primary" id="print-ticket-btn">Print ticket</button></div></div><div className="ticket-print"><div className="ticket-receipt examiner-ticket"><div className="ticket-head"><div className="ticket-brand">KSFDC ONLINE TICKET</div><div className="ticket-ticketno">#{booking.ticketNumber}</div></div><div className="ticket-admit">ADMIT : {admit}</div><div className="ticket-big">{booking.movieTitle}</div><div className="ticket-theatre">{booking.theatreName}</div><div className="ticket-highlight-row"><span className="ticket-chip">{dayBadge}</span><span className="ticket-chip strong">{showSlot}</span></div><div className="ticket-timebox"><div className="ticket-time-label">Show Date & Time</div><div className="ticket-time-value">{displayTime}</div></div><div className="ticket-seatbox"><div className="ticket-time-label">Seat Numbers</div><div className="ticket-seat-value">{booking.seats.join(', ')}</div></div><div className="ticket-detail-grid"><div><strong>Source</strong><span>{booking.bookingSource}</span></div><div><strong>Payment</strong><span>{booking.paymentMode || '—'}</span></div><div><strong>Printed From</strong><span>{booking.printIp || booking.requestIp || '—'}</span></div><div><strong>Tickets</strong><span>{admit}</span></div></div><div className="qr-wrap"><img alt="QR" src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${qr}`} width="160" height="160" /></div><div className="ticket-footer-note">Please present this ticket at the entry point. Seat numbers and show time are highlighted for quick verification.</div></div></div><script dangerouslySetInnerHTML={{__html:`document.getElementById('print-ticket-btn')?.addEventListener('click',()=>window.print())`}} /></main>;
}
