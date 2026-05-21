import { NextResponse } from 'next/server';
import { ensureCentralSchemaAndSeed } from '../../../../lib/bootstrap';
import { getDb, rows } from '../../../../lib/db';
import { safeJson } from '../../../../lib/show';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  try {
    const { bookingId } = await params;
    await ensureCentralSchemaAndSeed();
    const db = getDb();
    const [bookingRows] = await db.query(`SELECT * FROM central_bookings WHERE booking_id=? LIMIT 1`, [bookingId]);
    const b: any = rows<any>(bookingRows)[0];
    if (!b) return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });
    return NextResponse.json({ success: true, booking: {
      bookingId: b.booking_id,
      showId: b.show_id,
      ticketNumber: b.ticket_number,
      movieTitle: b.movie_title,
      theatreName: b.theatre_name,
      showTimeUtc: b.show_time_utc ? new Date(`${b.show_time_utc}Z`).toISOString() : null,
      seats: safeJson<string[]>(b.seats_json, []),
      pricing: safeJson<any>(b.pricing_json, null),
      bookingSource: b.booking_source,
      paymentMode: b.payment_mode || '',
    } });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: `Could not load ticket: ${error?.message || 'database not connected'}` }, { status: 500 });
  }
}
