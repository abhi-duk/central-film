import { NextRequest, NextResponse } from 'next/server';
import { determineAuthority, heartbeatHealthy } from '../../../../lib/authority';
import { getDb } from '../../../../lib/db';
import { markTimedOutTheatres, readMysqlStore, resolvePendingTransaction } from '../../../../lib/store';

export async function POST(req: NextRequest) {
  try {
    await markTimedOutTheatres(Number(process.env.HEARTBEAT_TIMEOUT_SECONDS || 30));
    const { holdId } = await req.json();
    const store = await readMysqlStore();
    const theatre = store.theatres[0];
    const held = store.bookings.find(b => b.holdId === holdId && b.bookingStatus === 'HELD');
    if (!held) return NextResponse.json({ success: true });

    const authority = determineAuthority(theatre, held.showTimeUtc);
    const healthy = heartbeatHealthy(theatre);

    if (authority === 'ONLINE' && !healthy) {
      const db = getDb();
      await db.query(`UPDATE bookings SET booking_status='FAILED', reconciliation_status='NOT_SYNCED' WHERE booking_id=?`, [held.bookingId]);
      if (held.sessionId) await resolvePendingTransaction(held.sessionId, 'FAILED', 'Central outage-mode hold released', held.bookingId);
      return NextResponse.json({ success: true });
    }

    const localBase = theatre.localPublicUrl || process.env.LOCAL_PUBLIC_URL || '';
    await fetch(`${localBase}/api/booking/release`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ holdId }),
    });
    if (held.sessionId) await resolvePendingTransaction(held.sessionId, 'FAILED', 'Local hold released before confirmation');
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true });
  }
}
