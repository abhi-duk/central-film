import { NextRequest, NextResponse } from 'next/server';
import { ensureCentralSchema } from '../../../lib/store';
import { getDb } from '../../../lib/db';

export async function POST(req: NextRequest) {
  try {
    await ensureCentralSchema();
    const body = await req.json();
    const db = getDb();
    await db.query(`UPDATE theatres SET local_public_url=?, working_hours_start=?, working_hours_end=?, outage_mode_working_hours=?, outage_mode_off_hours=?, lead_time_cutoff_min=?, updated_at=CURRENT_TIMESTAMP WHERE theatre_id=?`, [body.localPublicUrl, body.workingHoursStart, body.workingHoursEnd, body.outageModeWorkingHours, body.outageModeOffHours, Number(body.leadTimeCutoffMin || 120), body.theatreId]);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('save policy failed', e);
    return NextResponse.json({ success: false, message: 'Could not save policy' }, { status: 500 });
  }
}
