'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

function money(v: number) { return `₹${Number(v || 0).toFixed(2)}`; }
function formatWhen(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
}

export default function TicketPage() {
  const params = useParams<{ bookingId: string }>();
  const bookingId = params.bookingId;
  const [booking, setBooking] = useState<any>(null);
  const [message, setMessage] = useState('Loading ticket…');

  useEffect(() => {
    if (!bookingId) return;
    let active = true;
    fetch(`/api/ticket/${encodeURIComponent(bookingId)}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(out => {
        if (!active) return;
        setBooking(out?.booking || null);
        setMessage(out?.success ? '' : out?.message || 'Booking not found');
      })
      .catch(() => active && setMessage('Could not reach central API. Check database environment variables.'));
    return () => { active = false; };
  }, [bookingId]);

  if (!booking) return <main className="ticket-shell"><div className="hero-card"><div><div className="eyebrow">Central ticket</div><h1 className="page-title">{message}</h1></div><Link href="/book" className="btn btn-secondary">Back to booking</Link></div></main>;
  const seats: string[] = Array.isArray(booking.seats) ? booking.seats : [];
  const pricing = booking.pricing || {};
  const qr = encodeURIComponent(`${booking.ticketNumber}|${booking.movieTitle}|${seats.join(',')}`);
  return <main className="ticket-shell"><div className="hero-card"><div><div className="eyebrow">Central ticket issued</div><h1 className="page-title">Print or issue next ticket</h1></div><div className="ticket-actions"><Link href={`/book/show/${booking.showId}`} className="btn btn-secondary">Book another ticket</Link><button className="btn btn-primary" onClick={() => window.print()}>Print ticket</button></div></div><div className="ticket-print"><div className="ticket-receipt"><div style={{textAlign:'center',fontWeight:'bold'}}>KSFDC CENTRAL TICKET</div><div className="ticket-admit">ADMIT : {seats.length}</div><div className="ticket-big">{booking.movieTitle}</div><div>{booking.theatreName}</div><hr/><div><strong>Show:</strong> {formatWhen(booking.showTimeUtc)}</div><div><strong>Seats:</strong> {seats.join(', ')}</div><div><strong>Ticket No:</strong> {booking.ticketNumber}</div><div><strong>Source:</strong> {booking.bookingSource}</div><div><strong>Payment:</strong> {booking.paymentMode || '—'}</div><div><strong>Total:</strong> {money(pricing.total || 0)}</div><div className="qr-wrap"><img alt="QR" src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${qr}`} width="140" height="140"/></div></div></div></main>;
}
