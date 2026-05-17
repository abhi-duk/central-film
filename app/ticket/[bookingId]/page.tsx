"use client";

import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { PageShell } from '../../../components/PageShell';

type Booking = {
  bookingId: string;
  movieTitle: string;
  theatreName: string;
  showTime?: string | null;
  seats: string[];
  requestIp?: string | null;
  source?: string;
  sourceLabel?: string;
  createdAt?: string;
};

export default function TicketPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = use(params);
  const [booking, setBooking] = useState<Booking | null>(null);

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/bookings/central', { cache: 'no-store' });
      const data = await res.json();
      const found = (data.bookings || []).find((item: Booking) => item.bookingId === bookingId) || null;
      setBooking(found);
    };
    load();
  }, [bookingId]);

  const qrText = booking ? `${booking.bookingId}|${booking.movieTitle}|${booking.theatreName}|${booking.showTime || ''}|${booking.seats.join(',')}|${booking.requestIp || 'Unknown'}` : '';

  return (
    <PageShell title="Online booking confirmed" subtitle="Below is a theatre-style printable ticket receipt with all the show details and QR code.">
      <div className="card print-only-hide">
        <div className="notice">Friendly confirmation: your seats are confirmed. You can print this right away on a thermal printer style layout.</div>
        <div className="print-actions no-print">
          <button className="button cyan" onClick={() => window.print()}>Print ticket</button>
          <Link className="button secondary" href="/book">Book another ticket</Link>
          <Link className="button secondary" href="/reports">Open central reports</Link>
        </div>
      </div>
      {booking ? (
        <div className="ticket-shell mt24">
          <div className="ticket-head">
            <div className="ticket-brand">KSFDC Cinema Ticket</div>
            <div className="ticket-title">{booking.movieTitle}</div>
            <div className="ticket-sub">Online booking receipt</div>
          </div>
          <div className="ticket-body">
            <div className="ticket-row"><div><div className="ticket-label">Theatre</div></div><div className="ticket-value">{booking.theatreName}</div></div>
            <div className="ticket-row"><div><div className="ticket-label">Show time</div></div><div className="ticket-value">{booking.showTime ? new Date(booking.showTime).toLocaleString() : '-'}</div></div>
            <div className="ticket-row"><div><div className="ticket-label">Booked at</div></div><div className="ticket-value">{booking.createdAt ? new Date(booking.createdAt).toLocaleString() : '-'}</div></div>
            <div className="ticket-row"><div><div className="ticket-label">Booking ID</div></div><div className="ticket-value">{booking.bookingId}</div></div>
            <div className="ticket-row"><div><div className="ticket-label">Seat numbers</div></div><div className="ticket-value ticket-seats">{booking.seats.join(', ')}</div></div>
            <div className="ticket-row"><div><div className="ticket-label">Booking source</div></div><div className="ticket-value">{booking.sourceLabel || booking.source}</div></div>
            <div className="ticket-row"><div><div className="ticket-label">Machine IP</div></div><div className="ticket-value">{booking.requestIp || 'Unknown IP'}</div></div>
          </div>
          <div className="ticket-footer">
            <div className="ticket-qr"><img alt="Ticket QR" width="130" height="130" src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(qrText)}`} /></div>
            <div className="small" style={{ color: '#475569' }}>Please show this printed ticket or QR code at the entrance.</div>
          </div>
        </div>
      ) : <div className="card mt24"><div className="notice">Loading ticket...</div></div>}
    </PageShell>
  );
}
