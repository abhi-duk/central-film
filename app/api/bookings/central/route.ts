import { NextRequest, NextResponse } from 'next/server';
import { addBooking, readStore } from '../../../../lib/store';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const booking = {
    bookingId: `CENTRAL-${Date.now()}`,
    theatreId: body.theatreId,
    showId: body.showId,
    movieTitle: body.movieTitle,
    theatreName: body.theatreName,
    seats: body.seats || [],
    totalTickets: body.totalTickets || 0,
    source: 'ONLINE_OUTAGE_MODE' as const,
    status: 'CONFIRMED' as const,
    createdAt: new Date().toISOString(),
    syncedAt: new Date().toISOString(),
    note: body.note || 'Created centrally in ONLINE_PRIORITY outage mode',
    requestIp: body.requestIp || null,
    sourceLabel: body.sourceLabel || 'Booked online from the central fallback system',
  };
  addBooking(booking as any);
  return NextResponse.json({ success: true, booking });
}

export async function GET() {
  return NextResponse.json({ success: true, bookings: readStore().bookings });
}
