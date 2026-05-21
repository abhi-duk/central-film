import { NextRequest, NextResponse } from 'next/server';
import { ensureCentralSchemaAndSeed } from '../../../lib/bootstrap';
import { getDb } from '../../../lib/db';

export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest) {
  try {
    await ensureCentralSchemaAndSeed();
    const body = await req.json();
    const db = getDb();
    await db.query(`UPDATE booking_policies SET hold_seconds=?, heartbeat_timeout_seconds=?, allow_central_when_local_offline=?, block_online_when_local_live=?, updated_at_utc=UTC_TIMESTAMP() WHERE policy_id=1`, [Number(body.holdSeconds || 90), Number(body.heartbeatTimeoutSeconds || 30), body.allowCentralWhenLocalOffline ? 1 : 0, body.blockOnlineWhenLocalLive ? 1 : 0]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('policy save failed', error);
    return NextResponse.json({ success: false, message: 'Could not save policy' }, { status: 500 });
  }
}
