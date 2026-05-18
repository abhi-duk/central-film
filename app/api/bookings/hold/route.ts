import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { determineAuthority, heartbeatHealthy } from '../../../../lib/authority';
import { createPendingTransaction, markTimedOutTheatres, readMysqlStore, saveCentralBooking } from '../../../../lib/store';

export async function POST(req: NextRequest) {
  try {
    await markTimedOutTheatres(Number(process.env.HEARTBEAT_TIMEOUT_SECONDS || 30));
    const body = await req.json();
    const store = await readMysqlStore();
    const theatre = store.theatres[0];
    const authority = determineAuthority(theatre, body.showTimeIso);
    const healthy = heartbeatHealthy(theatre);
    const holdId = `HOLD-${crypto.randomUUID()}`;
    const sessionId = `SES-${crypto.randomUUID()}`;
    const idempotencyKey = `HOLD-${crypto.randomUUID()}`;
    const requestIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const sourceLabel = 'Central online server';

    if (authority === 'LOCAL' && !healthy) {
      return NextResponse.json({ success: false, message: 'The theatre connection is lost. Online booking is paused and only local counter booking is active.' }, { status: 400 });
    }

    if (authority === 'ONLINE' && !healthy) {
      const bookingId = `BOOK-${crypto.randomUUID()}`;
      const ticketNumber = `C-${Date.now()}`;
      await saveCentralBooking({
        bookingId, ticketNumber,
        theatreId: body.theatreId, showId: body.showId, movieTitle: body.movieTitle, theatreName: body.theatreName,
        showTimeUtc: body.showTimeIso, totalTickets: body.seatIds.length, seats: body.seatIds,
        bookingSource: 'ONLINE_OUTAGE_MODE', bookingStatus: 'HELD', reconciliationStatus: 'NOT_SYNCED',
        holdId, sessionId, idempotencyKey, requestIp, sourceLabel, heldAtUtc: new Date().toISOString(), confirmedAtUtc: null,
      });
      await createPendingTransaction({ sessionId, bookingId, theatreId: body.theatreId, showId: body.showId, authorityWhenStarted: 'ONLINE', idempotencyKey, notes: 'Central outage-mode hold created' });
      return NextResponse.json({ success: true, holdId, sessionId, mode: 'ONLINE' });
    }

    if (authority !== 'LOCAL') {
      return NextResponse.json({ success: false, message: 'Online booking is not allowed right now.' }, { status: 400 });
    }

    const localBase = theatre.localPublicUrl || process.env.LOCAL_PUBLIC_URL || '';
    const res = await fetch(`${localBase}/api/booking/hold`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        showId: body.showId,
        seatIds: body.seatIds,
        source: 'ONLINE_VIA_LOCAL',
        requestIp,
        sourceLabel,
      }),
    });
    const text = await res.text();
    let data: any = null;
    try { data = text ? JSON.parse(text) : null; } catch {}
    if (!res.ok || !data?.success) return NextResponse.json({ success: false, message: data?.message || 'Local hold failed' }, { status: 400 });

    try {
      await createPendingTransaction({ sessionId: data.sessionId, theatreId: body.theatreId, showId: body.showId, authorityWhenStarted: 'LOCAL', idempotencyKey, notes: 'Local hold acknowledged by central' });
    } catch (e) {
      await fetch(`${localBase}/api/booking/release`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ holdId: data.holdId }),
      }).catch(() => {});
      return NextResponse.json({ success: false, message: 'Could not mirror the hold to central. Seats have been released.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, holdId: data.holdId, sessionId: data.sessionId, mode: 'LOCAL' });
  } catch (error) {
    console.error('central hold failed', error);
    return NextResponse.json({ success: false, message: 'Could not hold seats' }, { status: 500 });
  }
}
