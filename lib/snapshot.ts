import { PoolConnection } from 'mysql2/promise';
import { getDb, rows } from './db';

export async function releaseExpiredHolds(showId: string, conn?: PoolConnection) {
  const db: any = conn || getDb();
  await db.query(`UPDATE seat_holds SET hold_status='EXPIRED', released_at_utc=UTC_TIMESTAMP() WHERE show_id=? AND hold_status='HELD' AND expires_at_utc < UTC_TIMESTAMP()`, [showId]);
  await db.query(`UPDATE show_seats SET seat_status='AVAILABLE', hold_id=NULL, hold_expires_at_utc=NULL WHERE show_id=? AND seat_status='HELD' AND hold_expires_at_utc IS NOT NULL AND hold_expires_at_utc < UTC_TIMESTAMP()`, [showId]);
}

export async function rebuildShowRuntimeSnapshot(showId: string, conn?: PoolConnection) {
  const db: any = conn || getDb();
  const [showRows] = await db.query(`SELECT show_id, premium_rate, executive_rate, economy_rate FROM shows WHERE show_id=? LIMIT 1`, [showId]);
  const show: any = rows<any>(showRows)[0];
  const [configRows] = await db.query(`SELECT gst_pct, entertainment_tax_pct, cess_pct FROM pricing_config WHERE config_id=1 LIMIT 1`);
  const config: any = rows<any>(configRows)[0];
  const [rowsRaw] = await db.query(`SELECT seat_id, seat_status, hold_expires_at_utc, seat_class FROM show_seats WHERE show_id=? ORDER BY seat_id`, [showId]);
  const seatRows: any[] = rows<any>(rowsRaw);
  const seatMap: Record<string, any> = {};
  const seatClasses: Record<string, string> = {};
  let availableCount = 0, heldCount = 0, bookedCount = 0;
  for (const row of seatRows) {
    const status = row.seat_status === 'BOOKED' ? 'BOOKED' : row.seat_status === 'HELD' ? 'HELD' : 'AVAILABLE';
    seatMap[row.seat_id] = { status, holdExpiresAt: row.hold_expires_at_utc };
    seatClasses[row.seat_id] = row.seat_class;
    if (status === 'AVAILABLE') availableCount++;
    else if (status === 'HELD') heldCount++;
    else bookedCount++;
  }
  const pricing = {
    premiumRate: Number(show?.premium_rate || 0),
    executiveRate: Number(show?.executive_rate || 0),
    economyRate: Number(show?.economy_rate || 0),
    gstPct: Number(config?.gst_pct || 12),
    entertainmentTaxPct: Number(config?.entertainment_tax_pct || 5),
    cessPct: Number(config?.cess_pct || 1),
  };
  await db.query(
    `INSERT INTO show_runtime_snapshot (show_id, version_no, seat_map_json, pricing_json, available_count, held_count, booked_count, updated_at_utc)
     VALUES (?, 1, ?, ?, ?, ?, ?, UTC_TIMESTAMP())
     ON DUPLICATE KEY UPDATE version_no=version_no+1, seat_map_json=VALUES(seat_map_json), pricing_json=VALUES(pricing_json), available_count=VALUES(available_count), held_count=VALUES(held_count), booked_count=VALUES(booked_count), updated_at_utc=UTC_TIMESTAMP()`,
    [showId, JSON.stringify({ seatMap, seatClasses }), JSON.stringify(pricing), availableCount, heldCount, bookedCount]
  );
}
