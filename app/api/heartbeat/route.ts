import { NextRequest, NextResponse } from 'next/server';
import { upsertHeartbeat } from '../../../lib/store';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Support both flat payload and nested payload for compatibility
    const appHealthy =
      typeof body.appHealthy === 'boolean'
        ? body.appHealthy
        : !!body?.health?.appHealthy;

    const dbHealthy =
      typeof body.dbHealthy === 'boolean'
        ? body.dbHealthy
        : !!body?.health?.dbHealthy;

    const bookingApiHealthy =
      typeof body.bookingApiHealthy === 'boolean'
        ? body.bookingApiHealthy
        : !!body?.health?.bookingApiHealthy;

    const syncPendingCount =
      body.syncPendingCount != null
        ? Number(body.syncPendingCount || 0)
        : Number(body?.sync?.pendingCount || 0);

    const syncSuccessCount =
      body.syncSuccessCount != null
        ? Number(body.syncSuccessCount || 0)
        : Number(body?.sync?.successCount || 0);

    const syncFailedCount =
      body.syncFailedCount != null
        ? Number(body.syncFailedCount || 0)
        : Number(body?.sync?.failedCount || 0);

    const syncConflictCount =
      body.syncConflictCount != null
        ? Number(body.syncConflictCount || 0)
        : Number(body?.sync?.conflictCount || 0);

    const recoveryReady =
      body.recoveryReady != null
        ? !!body.recoveryReady
        : body?.sync?.recoveryState === 'ONLINE';

    if (!body?.theatreId) {
      return NextResponse.json(
        { success: false, message: 'theatreId is required' },
        { status: 400 }
      );
    }

    await upsertHeartbeat(body.theatreId, {
      appHealthy,
      dbHealthy,
      bookingApiHealthy,
      syncPendingCount,
      syncSuccessCount,
      syncFailedCount,
      syncConflictCount,
      recoveryReady,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('heartbeat error', error);
    return NextResponse.json(
      { success: false, message: 'heartbeat failed' },
      { status: 500 }
    );
  }
}
