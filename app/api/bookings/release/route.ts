import { NextRequest, NextResponse } from 'next/server';
import { ensureCentralSchemaAndSeed } from '../../../../lib/bootstrap';
import { getDb, rows } from '../../../../lib/db';
import { rebuildShowRuntimeSnapshot } from '../../../../lib/snapshot';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let conn: any;
  try {
    await ensureCentralSchemaAndSeed();
    const { holdId, showId } = await req.json();
    if (!holdId) return NextResponse.json({ success: false, message: 'holdId is required' }, { status: 400 });
    const db = getDb();
    conn = await db.getConnection();
    await conn.beginTransaction();
    const [holdRows] = await conn.query(`SELECT * FROM seat_holds WHERE hold_id=? ${showId ? 'AND show_id=?' : ''} LIMIT 1 FOR UPDATE`, showId ? [holdId, showId] : [holdId]);
    const hold: any = rows<any>(holdRows)[0];
    if (!hold) { await conn.rollback(); return NextResponse.json({ success: false, message: 'Hold not found' }, { status: 404 }); }
    await conn.query(`UPDATE seat_holds SET hold_status='RELEASED', released_at_utc=UTC_TIMESTAMP() WHERE hold_id=?`, [holdId]);
    await conn.query(`UPDATE payment_transactions SET transaction_state='FAILED' WHERE hold_id=?`, [holdId]);
    await conn.query(`UPDATE show_seats SET seat_status='AVAILABLE', hold_id=NULL, hold_expires_at_utc=NULL WHERE hold_id=? AND seat_status='HELD'`, [holdId]);
    await rebuildShowRuntimeSnapshot(hold.show_id, conn);
    await conn.commit();
    return NextResponse.json({ success: true, holdId, showId: hold.show_id, status: 'RELEASED' });
  } catch (error) {
    if (conn) { try { await conn.rollback(); } catch {} }
    console.error('release failed', error);
    return NextResponse.json({ success: false, message: 'Could not release hold' }, { status: 500 });
  } finally { if (conn) conn.release(); }
}
