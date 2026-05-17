import { NextRequest, NextResponse } from 'next/server';
import { determineAuthority, heartbeatHealthy, onlineBookingAllowed } from '../../../../lib/authority';
import { addBooking, readStore } from '../../../../lib/store';

function clientIp(req: NextRequest) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'Unknown IP';
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const store = await readStore();
  const theatre = store.theatres[0];
  const showMeta: Record<string, { movieTitle: string; time: string }> = {
    'emp-1': { movieTitle: 'L2: Empuraan', time: '2026-05-17T18:30:00+05:30' },
    'emp-2': { movieTitle: 'L2: Empuraan', time: '2026-05-17T21:30:00+05:30' },
    'off-1': { movieTitle: 'Officer on Duty', time: '2026-05-17T19:00:00+05:30' },
  };
  const selectedShow = showMeta[body.showId];
  if (!selectedShow) return NextResponse.json({ success: false, message: 'Unknown show' }, { status: 404 });

  const authority = determineAuthority(theatre, selectedShow.time);
  const healthy = heartbeatHealthy(theatre);
  const canBookOnline = onlineBookingAllowed(theatre, selectedShow.time);
  const ip = body.customerIp || clientIp(req);

  if (!canBookOnline) {
    const message = !healthy && authority === 'LOCAL'
      ? 'Internet connection is lost at the theatre. Only local counter booking is active now.'
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
      note: `Booked online from ${ip} while theatre internet was unavailable.`,
      requestIp: ip,
      sourceLabel: 'Booked online from the central fallback system',
    };
    await addBooking(booking as any);
    return NextResponse.json({ success: true, booking });
  }

  try {
    const holdRes = await fetch(`${theatre.localPublicUrl}/api/booking/hold`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ showId: body.showId, seatIds: body.seatIds, source: 'ONLINE_VIA_LOCAL' }), cache: 'no-store'
    });
    const holdData = await holdRes.json();
    if (!holdRes.ok || !holdData.success) return NextResponse.json({ success: false, message: holdData.message || 'Seat hold failed at the theatre server.' }, { status: 409 });

    const confirmRes = await fetch(`${theatre.localPublicUrl}/api/booking/confirm`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ holdSessionId: holdData.holdSessionId, source: 'ONLINE_VIA_LOCAL', customerIp: ip }), cache: 'no-store'
    });
    const confirmData = await confirmRes.json();
    if (!confirmRes.ok || !confirmData.success) return NextResponse.json({ success: false, message: confirmData.message || 'Theatre confirmation failed.' }, { status: 409 });
    return NextResponse.json({ success: true, booking: confirmData.booking });
  } catch {
    return NextResponse.json({ success: false, message: 'Theatre server could not be reached. Please try again in a few moments.' }, { status: 502 });
  }
}
