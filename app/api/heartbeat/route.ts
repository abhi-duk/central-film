import { NextRequest, NextResponse } from 'next/server';
import { ensureCentralSchemaAndSeed } from '../../../lib/bootstrap';
import { getDb } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    await ensureCentralSchemaAndSeed();
    const body = await req.json();
    const theatreId = body.theatreId || process.env.THEATRE_ID || 'KSFDC_SREE_TVM';
    const db = getDb();
    await db.query(`INSERT INTO theatres (theatre_id, theatre_name, district, authority_mode, app_healthy, db_healthy, booking_api_healthy, sync_pending_count, sync_success_count, sync_failed_count, sync_conflict_count, last_heartbeat_utc, updated_at_utc)
      VALUES (?, ?, 'Thiruvananthapuram', 'LOCAL', ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())
      ON DUPLICATE KEY UPDATE app_healthy=VALUES(app_healthy), db_healthy=VALUES(db_healthy), booking_api_healthy=VALUES(booking_api_healthy), sync_pending_count=VALUES(sync_pending_count), sync_success_count=VALUES(sync_success_count), sync_failed_count=VALUES(sync_failed_count), sync_conflict_count=VALUES(sync_conflict_count), last_heartbeat_utc=UTC_TIMESTAMP(), updated_at_utc=UTC_TIMESTAMP()`,
      [theatreId, 'KSFDC Sree, TVM', body.appHealthy ? 1 : 0, body.dbHealthy ? 1 : 0, body.bookingApiHealthy ? 1 : 0, Number(body.syncPendingCount || 0), Number(body.syncSuccessCount || 0), Number(body.syncFailedCount || 0), Number(body.syncConflictCount || 0)]);
    return NextResponse.json({ success: true, theatreId, receivedAtUtc: new Date().toISOString() });
  } catch (error) {
    console.error('heartbeat failed', error);
    return NextResponse.json({ success: false, message: 'Could not record heartbeat' }, { status: 500 });
  }
}
