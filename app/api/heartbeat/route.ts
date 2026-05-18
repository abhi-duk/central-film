import { NextRequest, NextResponse } from 'next/server';
import { upsertHeartbeat } from '../../../lib/store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    await upsertHeartbeat(body.theatreId, {
      appHealthy: !!body.appHealthy,
      dbHealthy: !!body.dbHealthy,
      bookingApiHealthy: !!body.bookingApiHealthy,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('heartbeat error', error);
    return NextResponse.json({ success: false, message: 'heartbeat failed' }, { status: 500 });
  }
}
