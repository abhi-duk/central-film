export const dynamic = 'force-dynamic';
import BookingChooser from './booking-chooser';
import { markTimedOutTheatres, readMysqlStore } from '../../lib/store';
import { describeShow } from '../../lib/show';

export default async function BookPage() {
  await markTimedOutTheatres(Number(process.env.HEARTBEAT_TIMEOUT_SECONDS || 30));
  const store = await readMysqlStore();
  const theatre = store.theatres[0];
  const shows = [
    { showId: 'SHOW_EMP_001', movieTitle: 'L2: Empuraan', theatreName: theatre.name, timeIso: new Date(Date.now() + 2 * 3600 * 1000).toISOString() },
    { showId: 'SHOW_OD_001', movieTitle: 'Officer on Duty', theatreName: theatre.name, timeIso: new Date(Date.now() + 4 * 3600 * 1000).toISOString() },
  ].map(s => ({ ...s, ...describeShow(s.timeIso), pricing: s.showId === 'SHOW_EMP_001' ? { premiumRate:260, executiveRate:190, economyRate:130, gstPct:12, entertainmentTaxPct:5, cessPct:1 } : { premiumRate:220, executiveRate:170, economyRate:120, gstPct:12, entertainmentTaxPct:5, cessPct:1 } }));
  return <BookingChooser theatreId={theatre.theatreId} initialShows={shows as any} />;
}
