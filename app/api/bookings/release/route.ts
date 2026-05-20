import { NextRequest, NextResponse } from 'next/server';
import { readMysqlStore, resolvePendingTransaction, saveCentralBooking } from '../../../../lib/store';

export async function POST(req: NextRequest) {
  try {
    const { holdId } = await req.json();
    const store = await readMysqlStore();
    const theatre = store.theatres[0];
    const held:any = store.bookings.find((b:any) => b.holdId === holdId && b.bookingStatus === 'HELD');
    if (held && held.bookingSource === 'ONLINE_OUTAGE_MODE') {
      await saveCentralBooking({ ...held, bookingStatus: 'EXPIRED', reconciliationStatus: 'NOT_SYNCED' });
      if (held.sessionId) await resolvePendingTransaction(held.sessionId, 'EXPIRED', 'Hold released by user or timeout');
      return NextResponse.json({ success: true });
    }
    const localBase = theatre.localPublicUrl || process.env.LOCAL_PUBLIC_URL || '';
    if (localBase) await fetch(`${localBase}/api/booking/release`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ holdId }) }).catch(()=>{});
    if (held?.sessionId) await resolvePendingTransaction(held.sessionId, 'FAILED', 'Hold released');
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ success: true }); }
}
