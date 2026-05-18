import { readMysqlStore } from '../../../lib/store';

export const dynamic = 'force-dynamic';

export default async function TicketPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  const store = await readMysqlStore();
  const booking = store.bookings.find(b => b.bookingId === bookingId);
  if (!booking) return <main className="shell-main"><div className="card hero">Booking not found</div></main>;
  const displayTime = new Date(booking.showTimeUtc).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  return (
    <main className="shell-main">
      <div className="card hero">
        <div className="kicker" style={{color:'#86efac'}}>Booking Confirmed</div>
        <h1 className="section-title mt-2">Ticket issued successfully</h1>
        <div className="mt-6 ticket-print"><div className="ticket-receipt">
          <div style={{ textAlign: 'center', fontWeight: 'bold' }}>KSFDC ONLINE TICKET</div>
          <hr />
          <div><strong>Movie:</strong> {booking.movieTitle}</div>
          <div><strong>Theatre:</strong> {booking.theatreName}</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '6px' }}>Show: {displayTime}</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>Seats: {booking.seats.join(', ')}</div>
          <div><strong>Booking ID:</strong> {booking.bookingId}</div>
          <div><strong>Ticket No:</strong> {booking.ticketNumber}</div>
          <div><strong>Source:</strong> {booking.bookingSource}</div>
          <div style={{ marginTop: '10px', textAlign: 'center', border: '1px dashed #000', padding: '14px' }}>QR: {booking.ticketNumber}</div>
        </div></div>
        <button className="btn btn-primary mt-6" onClick={undefined as any}>Print Ticket</button>
        <script dangerouslySetInnerHTML={{ __html: `document.currentScript?.previousElementSibling?.addEventListener?.('click',()=>window.print())` }} />
      </div>
    </main>
  );
}
