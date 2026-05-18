import { getDb } from './db';
import type { Theatre } from './authority';

function toIso(value: any): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export async function readTheatres(): Promise<Theatre[]> {
  const db = getDb();
  const [rows] = await db.query<any[]>(`SELECT * FROM theatres ORDER BY theatre_id`);
  return rows.map((r) => ({
    theatreId: r.theatre_id,
    name: r.name,
    city: r.city,
    localPublicUrl: r.local_public_url || '',
    workingHoursStart: String(r.working_hours_start),
    workingHoursEnd: String(r.working_hours_end),
    outageModeWorkingHours: r.outage_mode_working_hours,
    outageModeOffHours: r.outage_mode_off_hours,
    leadTimeCutoffMin: Number(r.lead_time_cutoff_min || 120),
    heartbeatStatus: r.heartbeat_status,
    currentAuthority: r.current_authority,
    lastHeartbeatAt: toIso(r.last_heartbeat_at),
    updatedAt: toIso(r.updated_at),
    health: {
      appHealthy: !!r.app_healthy,
      dbHealthy: !!r.db_healthy,
      bookingApiHealthy: !!r.booking_api_healthy,
    },
  }));
}
