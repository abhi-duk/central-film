import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../lib/db';
import { ensureCentralSchema, saveCentralBooking } from '../../../../lib/store';

export async function POST(req: NextRequest) {
  try {
    const booking = await req.json();
    await ensureCentralSchema();
    const db = getDb();
    if (booking.sessionId) {
      await db.query(`DELETE FROM bookings WHERE session_id=? AND booking_status='HELD'`, [booking.sessionId]).catch(()=>{});
    }
    await saveCentralBooking({ ...booking, bookingStatus: booking.bookingStatus || 'CONFIRMED', reconciliationStatus: 'RECONCILED', syncedAt: new Date().toISOString() });
    return NextResponse.json({ success: true, state: 'MIRRORED' });
  } catch (error) {
    console.error('sync local booking failed', error);
    return NextResponse.json({ success: false, message: 'sync failed' }, { status: 500 });
  }
}
