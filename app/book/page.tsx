import ConnectionBanner from '../../components/ConnectionBanner';
import BookingChooser from './booking-chooser';
import { markTimedOutTheatres, readMysqlStore } from '../../lib/store';

const posters: Record<string, string> = {
  'L2: Empuraan': 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=1200&auto=format&fit=crop',
  'Officer on Duty': 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=1200&auto=format&fit=crop'
};

export default async function BookPage() {
  await markTimedOutTheatres(Number(process.env.HEARTBEAT_TIMEOUT_SECONDS || 30));
  const store = await readMysqlStore();
  const theatre = store.theatres[0];
  const shows = [
    { showId: 'SHOW_EMP_001', movieTitle: 'L2: Empuraan', theatreName: theatre.name, timeIso: new Date(Date.now() + 2 * 3600 * 1000).toISOString(), posterUrl: posters['L2: Empuraan'] },
    { showId: 'SHOW_OD_001', movieTitle: 'Officer on Duty', theatreName: theatre.name, timeIso: new Date(Date.now() + 4 * 3600 * 1000).toISOString(), posterUrl: posters['Officer on Duty'] },
  ];
  return (
    <main className="app-shell">
      <ConnectionBanner theatreId={theatre.theatreId} />
      <div className="page-wrap page-animate">
        <BookingChooser theatreId={theatre.theatreId} initialShows={shows as any} />
      </div>
    </main>
  );
}
