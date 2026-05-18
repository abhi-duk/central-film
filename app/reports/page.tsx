import Link from 'next/link';
import { readMysqlStore } from '../../lib/store';

export default async function ReportsPage() {
  const store = await readMysqlStore();
  return (
    <main className="app-shell">
      <div className="page-wrap page-animate space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="kicker">Central reports</div>
            <h1 className="mt-2 text-4xl font-black tracking-tight">Booking journal and mirrored audit records</h1>
          </div>
          <Link href="/" className="btn btn-secondary">Back to dashboard</Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="card-soft p-5"><div className="text-sm text-slate-400">Total records</div><div className="metric-value">{store.bookings.length}</div></div>
          <div className="card-soft p-5"><div className="text-sm text-slate-400">Confirmed</div><div className="metric-value">{store.bookings.filter(b => b.bookingStatus === 'CONFIRMED').length}</div></div>
          <div className="card-soft p-5"><div className="text-sm text-slate-400">Held / pending</div><div className="metric-value">{store.bookings.filter(b => b.bookingStatus !== 'CONFIRMED').length}</div></div>
        </div>
        <div className="card overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-800/80 text-slate-300">
              <tr>
                <th className="px-4 py-3 text-left">Booking ID</th>
                <th className="px-4 py-3 text-left">Movie</th>
                <th className="px-4 py-3 text-left">Seats</th>
                <th className="px-4 py-3 text-left">Source</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {store.bookings.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">No central records yet</td></tr>
              ) : store.bookings.map(b => (
                <tr key={b.bookingId} className="border-t border-white/5">
                  <td className="px-4 py-3 font-medium text-slate-100">{b.bookingId}</td>
                  <td className="px-4 py-3">{b.movieTitle}</td>
                  <td className="px-4 py-3">{b.seats.join(', ')}</td>
                  <td className="px-4 py-3">{b.bookingSource}</td>
                  <td className="px-4 py-3">{b.bookingStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
