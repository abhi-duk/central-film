import { NextRequest, NextResponse } from 'next/server';
import { readMysqlStore } from '../../../../lib/store';

export async function GET(req: NextRequest) {
  const holdId = req.nextUrl.searchParams.get('holdId');
  if (!holdId) return NextResponse.json({ success: false, message: 'holdId required' }, { status: 400 });
  const store = await readMysqlStore();
  const held = store.bookings.find((b:any) => b.holdId === holdId && b.bookingStatus === 'HELD');
  if (!held) return NextResponse.json({ success: false, message: 'Hold not found' }, { status: 404 });
  return NextResponse.json({ success: true, hold: { holdId, seats: held.seats, pricing: held.pricing }, show: { movieTitle: held.movieTitle, dayLabel: held.showLabel?.includes('Morning') ? 'Today' : 'Today', dateLabel: new Date(held.showTimeUtc).toLocaleDateString('en-IN', { weekday:'long',day:'numeric',month:'short',year:'numeric', timeZone:'Asia/Kolkata' }), timeLabel: new Date(held.showTimeUtc).toLocaleTimeString('en-IN', { hour:'numeric', minute:'2-digit', hour12:true, timeZone:'Asia/Kolkata' }), slot: held.showLabel || '' } });
}
