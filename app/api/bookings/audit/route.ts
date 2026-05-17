import { NextRequest, NextResponse } from 'next/server';
import { addBooking } from '../../../../lib/store';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const booking = {
    bookingId: body.bookingId,
    theatreId: body.theatreId,
    showId: body.showId,
    movieTitle: body.movieTitle,
    theatreName: body.theatreName,
    seats: body.seats || [],
    totalTickets: body.totalTickets || 0,
    showTime: body.showTime || null,
    bookingMode: body.bookingMode || 'OFFLINE',
    source: 'AUDIT_COPY' as const,
    status: 'CONFIRMED' as const,
    createdAt: body.createdAt || new Date().toISOString(),
    syncedAt: new Date().toISOString(),
    note: body.note || 'Copied from the theatre seat engine',
    requestIp: body.requestIp || null,
    sourceLabel: body.sourceLabel || (body.bookingMode === 'ONLINE' ? 'Booked online through the theatre server' : 'Booked at the theatre counter'),
  };
  await addBooking(booking as any);
  return NextResponse.json({ success: true, booking });
}
