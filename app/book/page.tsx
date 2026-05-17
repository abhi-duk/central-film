import { PageShell } from '../../components/PageShell';
import { readStore } from '../../lib/store';
import { BookingChooser } from './booking-chooser';

export const dynamic = 'force-dynamic';

const showCatalog = [
  { showId: 'emp-1', movieId: 'empuraan', movieTitle: 'L2: Empuraan', time: '2026-05-17T18:30:00+05:30' },
  { showId: 'emp-2', movieId: 'empuraan', movieTitle: 'L2: Empuraan', time: '2026-05-17T21:30:00+05:30' },
  { showId: 'off-1', movieId: 'officer', movieTitle: 'Officer on Duty', time: '2026-05-17T19:00:00+05:30' }
];

export default async function BookPage() {
  const theatre = (await readStore()).theatres[0];
  return (
    <PageShell
      title="Book your seats here"
      subtitle="Customers stay in the central booking flow. The system quietly checks the theatre node in the background and confirms seats without opening the local page."
    >
      <BookingChooser theatre={theatre} shows={showCatalog} />
    </PageShell>
  );
}
