import { NextResponse } from 'next/server';
import { ensureCentralSchemaAndSeed } from '../../../lib/bootstrap';
import { getDb, rows } from '../../../lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    await ensureCentralSchemaAndSeed();
    const db = getDb();
    const [showRows] = await db.query(`SELECT * FROM shows ORDER BY show_time_utc`);
    return NextResponse.json({ success: true, shows: rows<any>(showRows).map((show: any) => ({
      showId: show.show_id,
      screenName: show.screen_name,
      movieTitle: show.movie_title,
      theatreName: show.theatre_name,
      showTimeUtc: show.show_time_utc ? new Date(`${show.show_time_utc}Z`).toISOString() : null,
    })) });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: `Could not load shows: ${error?.message || 'database not connected'}`, shows: [] });
  }
}
