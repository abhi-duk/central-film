import { NextRequest, NextResponse } from 'next/server';
import { determineAuthority, heartbeatHealthy, onlineBookingAllowed } from '../../../../lib/authority';
import { readStore } from '../../../../lib/store';

function templateSeatMap() {
  const out: Record<string, { status: 'AVAILABLE' | 'HELD' | 'BOOKED' }> = {};
  for (const row of ['A','B','C','D','E']) for (let i = 1; i <= 8; i++) out[`${row}${i}`] = { status: 'AVAILABLE' };
  return out;
}

function nextShowIso(hour: number, minute: number) {
  const now = new Date();
  const utc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour - 5, minute - 30, 0));
  if (utc.getTime() <= now.getTime()) utc.setUTCDate(utc.getUTCDate() + 1);
  return utc.toISOString();
}

export async function GET(req: NextRequest) {
  const showId = req.nextUrl.searchParams.get('showId');
  if (!showId) return NextResponse.json({ success: false, message: 'showId is required' }, { status: 400 });
  const store = await readStore();
  const theatre = store.theatres[0];
  const showTimes: Record<string, { time: string; movieTitle: string }> = {
    'emp-1': { time: nextShowIso(18, 30), movieTitle: 'L2: Empuraan' },
    'emp-2': { time: nextShowIso(21, 30), movieTitle: 'L2: Empuraan' },
    'off-1': { time: nextShowIso(19, 0), movieTitle: 'Officer on Duty' },
  };
  const meta = showTimes[showId];
  const authority = determineAuthority(theatre, meta?.time);
  const healthy = heartbeatHealthy(theatre);
  const canBookOnline = onlineBookingAllowed(theatre, meta?.time);

  if (!healthy && authority === 'ONLINE') {
    const seatMap = templateSeatMap();
    store.bookings.filter((b) => b.showId === showId && b.status === 'CONFIRMED').forEach((booking) => booking.seats.forEach((seat) => { if (seatMap[seat]) seatMap[seat].status = 'BOOKED'; }));
    return NextResponse.json({ success: true, authority, heartbeatHealthy: healthy, canBookOnline, seatMap, show: { showId, movieTitle: meta?.movieTitle, time: meta?.time, theatreName: theatre.name } });
  }

  if (!healthy && authority === 'LOCAL') {
    return NextResponse.json({
      success: true, authority, heartbeatHealthy: healthy, canBookOnline,
      seatMap: templateSeatMap(), show: { showId, movieTitle: meta?.movieTitle, time: meta?.time, theatreName: theatre.name },
      message: 'Internet connection is lost at the theatre. This theatre is offline for online booking right now.',
    });
  }

  if (!healthy && authority === 'BLOCKED') {
    return NextResponse.json({
      success: true, authority, heartbeatHealthy: healthy, canBookOnline,
      seatMap: templateSeatMap(), show: { showId, movieTitle: meta?.movieTitle, time: meta?.time, theatreName: theatre.name },
      message: 'Internet connection is lost and booking is paused for the moment.',
    });
  }

  try {
    const res = await fetch(`${theatre.localPublicUrl}/api/public/show/${showId}`, { cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json({ success: !!data.success, authority, heartbeatHealthy: healthy, canBookOnline, seatMap: data.seatMap || {}, show: data.show });
  } catch {
    return NextResponse.json({ success: true, authority: 'BLOCKED', heartbeatHealthy: false, canBookOnline: false, seatMap: templateSeatMap(), show: { showId, movieTitle: meta?.movieTitle, time: meta?.time, theatreName: theatre.name } });
  }
}
