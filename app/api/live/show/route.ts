import { NextRequest, NextResponse } from 'next/server';
import { ensureCentralSchemaAndSeed } from '../../../../lib/bootstrap';
import { getTheatreHealth } from '../../../../lib/authority';
import { getDb, rows } from '../../../../lib/db';
import { describeShow, fromMysqlUtc, safeJson } from '../../../../lib/show';
import { rebuildShowRuntimeSnapshot, releaseExpiredHolds } from '../../../../lib/snapshot';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await ensureCentralSchemaAndSeed();
    const showId = req.nextUrl.searchParams.get('showId') || 'SHOW_EMP_001';
    const db = getDb();
    await releaseExpiredHolds(showId);
    await rebuildShowRuntimeSnapshot(showId);
    const [showRows] = await db.query(`SELECT * FROM shows WHERE show_id=? LIMIT 1`, [showId]);
    const show: any = rows<any>(showRows)[0];
    if (!show) return NextResponse.json({ success: false, message: 'Show not found' }, { status: 404 });
    const [snapRows] = await db.query(`SELECT * FROM show_runtime_snapshot WHERE show_id=? LIMIT 1`, [showId]);
    const snap: any = rows<any>(snapRows)[0];
    const payload = safeJson<any>(snap?.seat_map_json, { seatMap: {}, seatClasses: {} });
    const pricing = safeJson<any>(snap?.pricing_json, {});
    const showTime = fromMysqlUtc(show.show_time_utc);
    const health = await getTheatreHealth(show.theatre_id);
    return NextResponse.json({ success: true, show: { showId: show.show_id, theatreId: show.theatre_id, theatreName: show.theatre_name, movieTitle: show.movie_title, screenName: show.screen_name, time: showTime, ...describeShow(showTime) }, versionNo: Number(snap?.version_no || 1), seatMap: payload.seatMap || {}, seatClasses: payload.seatClasses || {}, pricing, authority: health.authority, heartbeatHealthy: health.heartbeatHealthy, canBookOnline: health.authority === 'ONLINE', message: health.authority === 'ONLINE' ? 'Central online booking is active.' : health.authority === 'LOCAL' ? 'Local counter has booking authority now. Online booking is paused.' : 'Booking is blocked by policy.' });
  } catch (error) {
    console.error('live show failed', error);
    return NextResponse.json({ success: false, message: 'Could not load show' }, { status: 500 });
  }
}
