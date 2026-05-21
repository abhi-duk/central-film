import { NextResponse } from 'next/server';
import { ensureCentralSchemaAndSeed } from '../../../lib/bootstrap';
import { getTheatreHealth } from '../../../lib/authority';
import { getDb, rows } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await ensureCentralSchemaAndSeed();
    const theatreId = process.env.THEATRE_ID || 'KSFDC_SREE_TVM';
    const health = await getTheatreHealth(theatreId);
    const db = getDb();
    const [pendingRows] = await db.query(`SELECT COUNT(*) AS cnt FROM local_booking_sync WHERE sync_status='RECEIVED'`);
    const pending = rows<any>(pendingRows)[0];
    return NextResponse.json({ success: true, dbHealthy: true, authority: health.authority, heartbeatHealthy: health.heartbeatHealthy, syncPendingCount: Number(pending?.cnt || 0), message: health.authority === 'LOCAL' ? 'Local theatre heartbeat is healthy. Local server has booking authority.' : health.authority === 'ONLINE' ? 'Local theatre is offline or timed out. Central booking can continue.' : 'Booking blocked by current policy.' });
  } catch (error) {
    console.error('central health failed', error);
    return NextResponse.json({ success: false, dbHealthy: false, authority: 'BLOCKED', heartbeatHealthy: false }, { status: 500 });
  }
}
