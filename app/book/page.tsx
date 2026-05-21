import BookingChooser from '@/components/BookingChooser';
import { getShows } from '@/lib/store';

export default async function BookPage() {
  const shows = await getShows();
  return <BookingChooser theatreId="THT_EMP" initialShows={shows} />;
}
