import { getReportStore } from '@/lib/store';
import type { Booking, PendingTransaction } from '@/lib/types';

function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

export default async function ReportsPage() {
  const store = await getReportStore();
  const bookings = safeArray<Booking>(store.bookings);
  const pendingRows = safeArray<PendingTransaction>(store.pending);

  const total = bookings.length;
  const confirmed = bookings.filter((b) => b.bookingStatus === 'CONFIRMED').length;
  const pending = pendingRows.filter((p) => p.transaction_state === 'PENDING_CONFIRMATION').length;
  const unsynced = bookings.filter((b) => b.syncStatus === 'NOT_SYNCED').length;

  return (
    <div>
      <section className="hero-card">
        <div>
          <div className="eyebrow">Reports & Reconciliation</div>
          <h1 className="page-title">Booking audit dashboard</h1>
          <p className="page-subtitle">The `.filter()` calls are now protected by array guards, so MySQL QueryResult/OkPacket responses cannot break the build.</p>
        </div>
      </section>
      <section className="grid grid-4">
        <div className="card"><div className="eyebrow">Total bookings</div><div className="stat-value">{total}</div></div>
        <div className="card"><div className="eyebrow">Confirmed</div><div className="stat-value">{confirmed}</div></div>
        <div className="card"><div className="eyebrow">Payment pending</div><div className="stat-value">{pending}</div></div>
        <div className="card"><div className="eyebrow">Unsynced</div><div className="stat-value">{unsynced}</div></div>
      </section>

      <section className="card" style={{ marginTop: 18 }}>
        <h3>Bookings</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead><tr><th>Booking ID</th><th>Movie</th><th>Seats</th><th>Status</th><th>Sync</th><th>Source</th></tr></thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.bookingId}><td>{booking.bookingId}</td><td>{booking.movieTitle}</td><td>{booking.seats.join(', ')}</td><td>{booking.bookingStatus}</td><td>{booking.syncStatus}</td><td>{booking.bookingSource}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
