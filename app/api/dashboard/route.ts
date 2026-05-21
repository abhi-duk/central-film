import { NextResponse } from 'next/server';
import { ensureCentralSchemaAndSeed } from '../../../lib/bootstrap';
import { getDb, rows } from '../../../lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function showDto(show: any) {
  return {
    showId: show.show_id,
    screenName: show.screen_name,
    movieTitle: show.movie_title,
    theatreName: show.theatre_name,
    showTimeUtc: show.show_time_utc ? new Date(`${show.show_time_utc}Z`).toISOString() : null,
  };
}

export async function GET() {
  try {
    await ensureCentralSchemaAndSeed();
    const db = getDb();
    const [showRows] = await db.query(`SELECT * FROM shows ORDER BY show_time_utc`);
    const [totalsRows] = await db.query(`SELECT COUNT(*) AS bookings, COALESCE(SUM(total_tickets),0) AS tickets FROM central_bookings`);
    const [localRows] = await db.query(`SELECT COUNT(*) AS cnt FROM central_bookings WHERE booking_source LIKE 'LOCAL%'`);
    const [heartRows] = await db.query(`SELECT * FROM theatres LIMIT 1`);
    const totals: any = rows<any>(totalsRows)[0] || {};
    const local: any = rows<any>(localRows)[0] || {};
    const theatre: any = rows<any>(heartRows)[0] || {};
    return NextResponse.json({
      success: true,
      stats: { bookings: Number(totals.bookings || 0), tickets: Number(totals.tickets || 0), localSynced: Number(local.cnt || 0) },
      theatre: { theatreId: theatre.theatre_id || '', lastHeartbeatUtc: theatre.last_heartbeat_utc ? new Date(`${theatre.last_heartbeat_utc}Z`).toISOString() : null },
      shows: rows<any>(showRows).map(showDto),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: `Central database is not reachable: ${error?.message || 'check env variables'}`, stats: { bookings: 0, tickets: 0, localSynced: 0 }, theatre: {}, shows: [] });
  }
}
