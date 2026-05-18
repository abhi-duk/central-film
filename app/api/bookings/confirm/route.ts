import { NextRequest, NextResponse } from 'next/server';
import { determineAuthority, heartbeatHealthy } from '../../../../lib/authority';
import { markTimedOutTheatres, readMysqlStore, resolvePendingTransaction, saveCentralBooking } from '../../../../lib/store';

export async function POST(req: NextRequest) {
  try {
    await markTimedOutTheatres(Number(process.env.HEARTBEAT_TIMEOUT_SECONDS || 30));
    const { holdId } = await req.json();
    const store = await readMysqlStore();
    const theatre = store.theatres[0];
    const held = store.bookings.find(b => b.holdId === holdId && b.bookingStatus === 'HELD');
    const authority = held ? determineAuthority(theatre, held.showTimeUtc) : determineAuthority(theatre);
    const healthy = heartbeatHealthy(theatre);

    if (authority === 'ONLINE' && !healthy) {
      if (!held) return NextResponse.json({ success: false, message: 'Hold not found' }, { status: 404 });
      await saveCentralBooking({ ...held, bookingStatus: 'CONFIRMED', reconciliationStatus: 'NOT_SYNCED', confirmedAtUtc: new Date().toISOString() });
      if (held.sessionId) await resolvePendingTransaction(held.sessionId, 'CONFIRMED', 'Central outage-mode booking confirmed', held.bookingId);
      return NextResponse.json({ success: true, bookingId: held.bookingId });
    }

    if (authority === 'LOCAL' && !healthy) {
      if (held?.sessionId) await resolvePendingTransaction(held.sessionId, 'FAILED', 'Online confirm blocked because theatre heartbeat is offline and local-only mode is active');
      return NextResponse.json({ success: false, message: 'The theatre connection is lost. Online booking is paused and only local counter booking is active.' }, { status: 400 });
    }

    const localBase = theatre.localPublicUrl || process.env.LOCAL_PUBLIC_URL || '';
    const res = await fetch(`${localBase}/api/booking/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ holdId }),
    });
    const text = await res.text();
    let data: any = null;
    try { data = text ? JSON.parse(text) : null; } catch {}
    if (!res.ok || !data?.success) {
      if (held?.sessionId) await resolvePendingTransaction(held.sessionId, 'FAILED', data?.message || 'Local confirm failed');
      return NextResponse.json({ success: false, message: data?.message || 'Local confirm failed' }, { status: 400 });
    }

    await saveCentralBooking({
      bookingId: data.bookingId,
      ticketNumber: data.ticketNumber,
      theatreId: data.booking.theatreId,
      showId: data.booking.showId,
      movieTitle: data.booking.movieTitle,
      theatreName: data.booking.theatreName,
      showTimeUtc: data.booking.showTimeUtc,
      totalTickets: data.booking.totalTickets,
      seats: data.booking.seats,
      bookingSource: 'AUDIT_COPY_FROM_LOCAL',
      bookingStatus: 'CONFIRMED',
      reconciliationStatus: 'RECONCILED',
      holdId,
      sessionId: data.booking.sessionId,
      idempotencyKey: data.booking.idempotencyKey,
      requestIp: data.booking.requestIp,
      sourceLabel: data.booking.sourceLabel,
      heldAtUtc: null,
      confirmedAtUtc: new Date().toISOString(),
    });
    if (data.booking.sessionId) await resolvePendingTransaction(data.booking.sessionId, 'CONFIRMED', 'Local confirmation mirrored to central', data.bookingId);

    return NextResponse.json({ success: true, bookingId: data.bookingId });
  } catch (error) {
    console.error('central confirm failed', error);
    return NextResponse.json({ success: false, message: 'Could not confirm booking' }, { status: 500 });
  }
}
