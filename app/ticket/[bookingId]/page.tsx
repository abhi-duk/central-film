import Link from 'next/link';
import { readMysqlStore } from '@/lib/store';

export default async function TicketPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  const store = await readMysqlStore();
  const booking = store.bookings.find((item) => item.bookingId === bookingId);
  if (!booking) {
    return (
      <div className="hero-card">
        <div>
          <div className="eyebrow">Ticket</div>
          <h1 className="page-title">Ticket not found</h1>
          <p className="page-subtitle">The requested booking is not available in central memory or MySQL.</p>
          <Link className="btn btn-primary" href="/reports" style={{ marginTop: 18 }}>Back to reports</Link>
        </div>
      </div>
    );
  }
  return (
    <div className="hero-card">
      <div>
        <div className="eyebrow">E-Ticket</div>
        <h1 className="page-title">{booking.movieTitle}</h1>
        <p className="page-subtitle">{booking.theatreName} • {new Date(booking.showTimeIso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
        <div className="compact-card" style={{ padding: 18, marginTop: 18 }}>
          <strong>Booking ID:</strong> {booking.bookingId}<br />
          <strong>Show ID:</strong> {booking.showId}<br />
          <strong>Seats:</strong> {booking.seats.join(', ')}<br />
          <strong>Amount:</strong> ₹{booking.amount.toFixed(2)}<br />
          <strong>Status:</strong> {booking.bookingStatus}
        </div>
        <Link href="/reports" className="btn btn-secondary" style={{ marginTop: 18 }}>Reports</Link>
      </div>
    </div>
  );
}
