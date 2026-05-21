import { NextRequest, NextResponse } from 'next/server';
import { saveCentralBooking } from '@/lib/store';

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-central-secret');
  if (process.env.CENTRAL_SHARED_SECRET && secret !== process.env.CENTRAL_SHARED_SECRET) {
    return NextResponse.json({ success: false, message: 'Invalid shared secret' }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const incoming = Array.isArray(body.bookings) ? body.bookings : [body.booking || body];
  const saved = [];
  for (const item of incoming.filter(Boolean)) saved.push(await saveCentralBooking(item));
  return NextResponse.json({ success: true, saved });
}
