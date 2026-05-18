import ConnectionBanner from '../../components/ConnectionBanner';
import BookingChooser from './booking-chooser';
import { markTimedOutTheatres, readMysqlStore } from '../../lib/store';

export default async function BookPage() {
  await markTimedOutTheatres(Number(process.env.HEARTBEAT_TIMEOUT_SECONDS || 30));
  const store = await readMysqlStore();
  const theatre = store.theatres[0];
  const shows = [
    { showId: 'SHOW_EMP_001', movieTitle: 'L2: Empuraan', theatreName: theatre.name, timeIso: new Date(Date.now() + 2 * 3600 * 1000).toISOString() },
    { showId: 'SHOW_OD_001', movieTitle: 'Officer on Duty', theatreName: theatre.name, timeIso: new Date(Date.now() + 4 * 3600 * 1000).toISOString() },
  ];
  return (
    <main className="min-h-screen">
      <ConnectionBanner theatreId={theatre.theatreId} />
      <div className="mx-auto max-w-6xl px-6 py-8">
        <BookingChooser theatreId={theatre.theatreId} initialShows={shows} />
      </div>
    </main>
  );
}
