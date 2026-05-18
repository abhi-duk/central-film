import ConnectionBanner from '../../components/ConnectionBanner';
import BookingChooser from './booking-chooser';
import { markTimedOutTheatres, readMysqlStore } from '../../lib/store';

export const dynamic = 'force-dynamic';

export default async function BookPage() {
  await markTimedOutTheatres(Number(process.env.HEARTBEAT_TIMEOUT_SECONDS || 30));
  const store = await readMysqlStore();
  const theatre = store.theatres[0];
  const shows = [
    { showId: 'SHOW_EMP_001', movieTitle: 'L2: Empuraan', theatreName: theatre.name, timeIso: new Date(Date.now() + 2 * 3600 * 1000).toISOString() },
    { showId: 'SHOW_OD_001', movieTitle: 'Officer on Duty', theatreName: theatre.name, timeIso: new Date(Date.now() + 4 * 3600 * 1000).toISOString() },
  ];
  return (
    <main>
      <ConnectionBanner theatreId={theatre.theatreId} />
      <div className="shell-main">
        <BookingChooser theatreId={theatre.theatreId} initialShows={shows} />
      </div>
    </main>
  );
}
