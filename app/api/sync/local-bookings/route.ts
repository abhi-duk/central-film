import { NextRequest, NextResponse } from 'next/server';
import { saveCentralBooking } from '../../../../lib/store';

export async function POST(req: NextRequest) {
  try {
    const booking = await req.json();
    await saveCentralBooking({ ...booking, bookingStatus: booking.bookingStatus || 'CONFIRMED', reconciliationStatus: 'RECONCILED', syncedAt: new Date().toISOString() });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('sync local booking failed', error);
    return NextResponse.json({ success: false, message: 'sync failed' }, { status: 500 });
  }
}
