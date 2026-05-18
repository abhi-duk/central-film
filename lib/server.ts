import { getDb } from './db';
import { ensureSchema } from './schema';
import { Theatre } from './authority';

export async function getTheatres(): Promise<Theatre[]> {
  await ensureSchema();
  const db = getDb();
  const [rows] = await db.query<any[]>(`SELECT * FROM theatres ORDER BY theatre_id`);
  return rows.map(r => ({
    theatreId: r.theatre_id,
    name: r.name,
    city: r.city,
    localPublicUrl: r.local_public_url || process.env.LOCAL_PUBLIC_URL || '',
    workingHoursStart: String(r.working_hours_start),
    workingHoursEnd: String(r.working_hours_end),
    outageModeWorkingHours: r.outage_mode_working_hours,
    outageModeOffHours: r.outage_mode_off_hours,
    leadTimeCutoffMin: Number(r.lead_time_cutoff_min || 120),
    heartbeatStatus: r.heartbeat_status,
    currentAuthority: r.current_authority,
    lastHeartbeatAt: r.last_heartbeat_at ? new Date(r.last_heartbeat_at + 'Z').toISOString() : null,
    health: { appHealthy: !!r.app_healthy, dbHealthy: !!r.db_healthy, bookingApiHealthy: !!r.booking_api_healthy }
  }));
}

export async function getTheatre(theatreId: string) {
  const theatres = await getTheatres();
  return theatres.find(t => t.theatreId === theatreId) || null;
}
