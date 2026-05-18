import Link from 'next/link';
import { readMysqlStore } from '../../lib/store';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const store = await readMysqlStore();
  return (
    <main className="shell-main space-y-6">
      <section className="card hero">
        <div className="kicker">Reports</div>
        <h1 className="section-title mt-2">Central booking records</h1>
        <p className="subtle mt-2">Operational visibility for mirrored local bookings and fallback online transactions.</p>
      </section>
      <section className="card p-4 table-wrap">
        <table className="table">
          <thead>
            <tr><th>Booking ID</th><th>Movie</th><th>Seats</th><th>Source</th><th>Status</th></tr>
          </thead>
          <tbody>
            {store.bookings.length === 0 ? (
              <tr><td colSpan={5} className="text-center subtle">No bookings recorded yet</td></tr>
            ) : store.bookings.map(b => (
              <tr key={b.bookingId}><td>{b.bookingId}</td><td>{b.movieTitle}</td><td>{b.seats.join(', ')}</td><td>{b.bookingSource}</td><td>{b.bookingStatus}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
      <Link href="/" className="btn btn-secondary">Back to Dashboard</Link>
    </main>
  );
}
