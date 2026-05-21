import { NextResponse } from 'next/server';
import { ensureCentralSchemaAndSeed } from '../../../lib/bootstrap';
import { getTheatreHealth } from '../../../lib/authority';
import { getDb, rows } from '../../../lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    await ensureCentralSchemaAndSeed();
    const db = getDb();
    const [theatreRows] = await db.query(`SELECT theatre_id FROM theatres ORDER BY theatre_id LIMIT 1`);
    const theatreId = rows<any>(theatreRows)[0]?.theatre_id || process.env.THEATRE_ID || 'KSFDC_SREE_TVM';
    const health = await getTheatreHealth(theatreId);
    const [pendingRows] = await db.query(`SELECT COUNT(*) AS cnt FROM payment_transactions WHERE transaction_state='PENDING_CONFIRMATION'`);
    return NextResponse.json({ success: true, dbHealthy: true, syncPendingCount: Number(rows<any>(pendingRows)[0]?.cnt || 0), ...health });
  } catch (error: any) {
    return NextResponse.json({ success: true, dbHealthy: false, authority: 'BLOCKED', heartbeatHealthy: false, syncPendingCount: 0, message: `Database not connected: ${error?.message || 'check central DB variables'}` });
  }
}
