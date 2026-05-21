import { NextRequest, NextResponse } from 'next/server';
import { upsertHeartbeat } from '../../../lib/store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    await upsertHeartbeat(body.theatreId, {
      appHealthy: !!body.appHealthy,
      dbHealthy: !!body.dbHealthy,
      bookingApiHealthy: !!body.bookingApiHealthy,
      syncPendingCount: Number(body.syncPendingCount || 0),
      syncSuccessCount: Number(body.syncSuccessCount || 0),
      syncFailedCount: Number(body.syncFailedCount || 0),
      syncConflictCount: Number(body.syncConflictCount || 0),
      recoveryReady: !!body.recoveryReady,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('heartbeat error', error);
    return NextResponse.json({ success: false, message: 'heartbeat failed' }, { status: 500 });
  }
}
