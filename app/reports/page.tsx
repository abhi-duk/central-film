import { PageShell } from '../../components/PageShell';
import { readStore } from '../../lib/store';

export const dynamic = 'force-dynamic';

export default function ReportsPage() {
  const store = readStore();
  const byMovie: Record<string, { bookings: number; tickets: number }> = {};
  const byMode: Record<string, { bookings: number; tickets: number }> = {};

  for (const booking of store.bookings as any[]) {
    byMovie[booking.movieTitle] ||= { bookings: 0, tickets: 0 };
    byMovie[booking.movieTitle].bookings += 1;
    byMovie[booking.movieTitle].tickets += booking.totalTickets;

    const key = booking.sourceLabel || booking.source;
    byMode[key] ||= { bookings: 0, tickets: 0 };
    byMode[key].bookings += 1;
    byMode[key].tickets += booking.totalTickets;
  }

  return (
    <PageShell
      title="Central reports and audit copy"
      subtitle="These records are copied from the theatre seat engine or created in central fallback mode. They are here for monitoring, customer support, and audit visibility."
    >
      <div className="grid grid-2">
        <div className="card">
          <div className="kicker">By movie</div>
          <div className="tableWrap mt24">
            <table>
              <thead><tr><th>Movie</th><th>Bookings</th><th>Tickets</th></tr></thead>
              <tbody>
                {Object.entries(byMovie).length === 0 ? <tr><td colSpan={3}>No records yet</td></tr> :
                  Object.entries(byMovie).map(([movie, data]) => <tr key={movie}><td>{movie}</td><td>{data.bookings}</td><td>{data.tickets}</td></tr>)
                }
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <div className="kicker">By booking type</div>
          <div className="tableWrap mt24">
            <table>
              <thead><tr><th>Booking type</th><th>Bookings</th><th>Tickets</th></tr></thead>
              <tbody>
                {Object.entries(byMode).length === 0 ? <tr><td colSpan={3}>No records yet</td></tr> :
                  Object.entries(byMode).map(([mode, data]) => <tr key={mode}><td>{mode}</td><td>{data.bookings}</td><td>{data.tickets}</td></tr>)
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div className="card mt24">
        <div className="kicker">Raw booking records</div>
        <div className="tableWrap mt24">
          <table>
            <thead><tr><th>Booking ID</th><th>Movie</th><th>Seats</th><th>How it was booked</th><th>Machine IP</th><th>Status</th><th>Created</th></tr></thead>
            <tbody>
              {store.bookings.length === 0 ? <tr><td colSpan={7}>No records yet</td></tr> :
                (store.bookings as any[]).map((b) => (
                  <tr key={b.bookingId}>
                    <td>{b.bookingId}</td>
                    <td>{b.movieTitle}</td>
                    <td>{b.seats.join(', ')}</td>
                    <td>{b.sourceLabel || b.source}</td>
                    <td>{b.requestIp || 'Unknown IP'}</td>
                    <td>{b.status}</td>
                    <td>{new Date(b.createdAt).toLocaleString()}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}
