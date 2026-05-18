import Link from 'next/link';
import { readMysqlStore } from '../../lib/store';

export default async function ReportsPage() {
  const store = await readMysqlStore();
  return (
    <main className="min-h-screen px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="text-cyan-300">← Back</Link>
        <h1 className="mt-4 text-3xl font-bold">Central Reports</h1>
        <div className="mt-6 card overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-800 text-slate-300">
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
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No bookings yet</td></tr>
              ) : store.bookings.map(b => (
                <tr key={b.bookingId} className="border-t border-slate-800">
                  <td className="px-4 py-3">{b.bookingId}</td>
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
