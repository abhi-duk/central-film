import { NextRequest, NextResponse } from 'next/server';
import { ensureCentralSchemaAndSeed } from '../../../../lib/bootstrap';
import { getDb, rows } from '../../../../lib/db';
import { describeShow, fromMysqlUtc, safeJson } from '../../../../lib/show';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await ensureCentralSchemaAndSeed();
    const holdId = req.nextUrl.searchParams.get('holdId') || '';
    const showId = req.nextUrl.searchParams.get('showId') || '';
    if (!holdId) return NextResponse.json({ success: false, message: 'holdId is required' }, { status: 400 });
    const db = getDb();
    const [holdRows] = await db.query(`SELECT * FROM seat_holds WHERE hold_id=? ${showId ? 'AND show_id=?' : ''} LIMIT 1`, showId ? [holdId, showId] : [holdId]);
    const hold: any = rows<any>(holdRows)[0];
    if (!hold) return NextResponse.json({ success: false, message: 'Hold not found' }, { status: 404 });
    const [showRows] = await db.query(`SELECT * FROM shows WHERE show_id=? LIMIT 1`, [hold.show_id]);
    const show: any = rows<any>(showRows)[0];
    const showTime = fromMysqlUtc(show.show_time_utc);
    const seats = safeJson<string[]>(hold.seat_ids_json, []);
    const pricing = safeJson<any>(hold.pricing_json, null);
    return NextResponse.json({ success: true, hold: { holdId: hold.hold_id, showId: hold.show_id, seats, pricing, amount: pricing?.total || 0, status: hold.hold_status, expiresAtUtc: fromMysqlUtc(hold.expires_at_utc) }, show: { showId: show.show_id, theatreName: show.theatre_name, movieTitle: show.movie_title, time: showTime, ...describeShow(showTime) } });
  } catch (error) {
    console.error('hold details failed', error);
    return NextResponse.json({ success: false, message: 'Could not load hold details' }, { status: 500 });
  }
}
