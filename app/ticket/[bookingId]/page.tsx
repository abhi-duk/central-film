import { readMysqlStore } from '../../../lib/store';

export default async function TicketPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  const store = await readMysqlStore();
  const booking = store.bookings.find(b => b.bookingId === bookingId);
  if (!booking) return <main className="p-8">Booking not found</main>;
  const displayTime = new Date(booking.showTimeUtc).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-xl card p-6">
        <div className="text-sm uppercase tracking-[0.3em] text-emerald-300">Booking confirmed</div>
        <h1 className="mt-2 text-3xl font-bold">Ticket issued successfully</h1>
        <div className="mt-6 ticket-print">
          <div className="ticket-receipt">
            <div style={{ textAlign: 'center', fontWeight: 'bold' }}>KSFDC ONLINE TICKET</div>
            <hr />
            <div><strong>Movie:</strong> {booking.movieTitle}</div>
            <div><strong>Theatre:</strong> {booking.theatreName}</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '6px' }}>Show: {displayTime}</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>Seats: {booking.seats.join(', ')}</div>
            <div><strong>Booking ID:</strong> {booking.bookingId}</div>
            <div><strong>Ticket No:</strong> {booking.ticketNumber}</div>
            <div><strong>Source:</strong> {booking.bookingSource}</div>
            <div><strong>Issued:</strong> {booking.confirmedAtUtc ? new Date(booking.confirmedAtUtc).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '-'}</div>
            <div style={{ marginTop: '10px', textAlign: 'center', border: '1px dashed #000', padding: '14px' }}>QR: {booking.ticketNumber}</div>
          </div>
        </div>
        <button className="btn btn-primary mt-6" onClick={undefined as any}>Use browser print</button>
        <script dangerouslySetInnerHTML={{ __html: `document.currentScript?.previousElementSibling?.addEventListener?.('click',()=>window.print())` }} />
      </div>
    </main>
  );
}
