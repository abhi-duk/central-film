import { NextRequest, NextResponse } from 'next/server';
import { determineAuthority, heartbeatHealthy, onlineBookingAllowed } from '../../../../lib/authority';
import { addBooking, readStore } from '../../../../lib/store';

function clientIp(req: NextRequest) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'Unknown IP';
}

function nextShowIso(hour: number, minute: number) {
  const now = new Date();
  const utc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour - 5, minute - 30, 0));
  if (utc.getTime() <= now.getTime()) utc.setUTCDate(utc.getUTCDate() + 1);
  return utc.toISOString();
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const store = await readStore();
  const theatre = store.theatres[0];
  const showMeta: Record<string, { movieTitle: string; time: string }> = {
    'emp-1': { movieTitle: 'L2: Empuraan', time: nextShowIso(18, 30) },
    'emp-2': { movieTitle: 'L2: Empuraan', time: nextShowIso(21, 30) },
    'off-1': { movieTitle: 'Officer on Duty', time: nextShowIso(19, 0) },
  };
  const selectedShow = showMeta[body.showId];
  if (!selectedShow) return NextResponse.json({ success: false, message: 'Unknown show' }, { status: 404 });

  const authority = determineAuthority(theatre, selectedShow.time);
  const healthy = heartbeatHealthy(theatre);
  const canBookOnline = onlineBookingAllowed(theatre, selectedShow.time);
  const ip = body.customerIp || clientIp(req);

  if (!canBookOnline) {
    const message = !healthy && authority === 'LOCAL'
      ? 'Internet connection is lost at the theatre. This theatre is offline for online booking right now.'
      : 'Internet connection is lost and booking is paused for the moment.';
    return NextResponse.json({ success: false, message }, { status: 409 });
  }

  if (!healthy && authority === 'ONLINE') {
    const booking = {
      bookingId: `CENTRAL-${Date.now()}`,
      theatreId: theatre.theatreId,
      showId: body.showId,
      movieTitle: selectedShow.movieTitle,
      theatreName: theatre.name,
      seats: body.seatIds || [],
      totalTickets: (body.seatIds || []).length,
      showTime: selectedShow.time,
      bookingMode: 'ONLINE' as const,
      source: 'ONLINE_OUTAGE_MODE' as const,
      status: 'CONFIRMED' as const,
      createdAt: new Date().toISOString(),
      syncedAt: new Date().toISOString(),
      note: 'Created centrally in ONLINE_PRIORITY outage mode',
      requestIp: ip,
      sourceLabel: 'Booked online from the central fallback system',
    };
    await addBooking(booking as any);
    return NextResponse.json({ success: true, booking });
  }

  try {
    const localHold = await fetch(`${theatre.localPublicUrl}/api/booking/hold`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
      body: JSON.stringify({ showId: body.showId, seatIds: body.seatIds, source: 'ONLINE_VIA_LOCAL' }),
    });
    const holdData = await localHold.json();
    if (!holdData.success) return NextResponse.json({ success: false, message: holdData.message || 'Seats could not be held.' }, { status: 409 });
    const localConfirm = await fetch(`${theatre.localPublicUrl}/api/booking/confirm`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
      body: JSON.stringify({ holdSessionId: holdData.holdSessionId, source: 'ONLINE_VIA_LOCAL', customerIp: ip }),
    });
    const confirmData = await localConfirm.json();
    if (!confirmData.success) return NextResponse.json({ success: false, message: confirmData.message || 'Ticket confirmation failed.' }, { status: 409 });
    if (confirmData.booking) await addBooking({ ...confirmData.booking, syncedAt: new Date().toISOString() });
    return NextResponse.json({ success: true, booking: confirmData.booking });
  } catch {
    return NextResponse.json({ success: false, message: 'The theatre server could not confirm your seat right now.' }, { status: 502 });
  }
}
