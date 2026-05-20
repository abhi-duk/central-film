import { getDb } from './db';
import type { Theatre } from './authority';

function toIso(v: any) { return v ? new Date(`${String(v).replace(' ', 'T')}Z`).toISOString() : null; }

export async function ensureCentralSchema() {
  const db = getDb();
  await db.query(`CREATE TABLE IF NOT EXISTS theatres (
    theatre_id VARCHAR(80) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    city VARCHAR(100) NOT NULL,
    local_public_url TEXT NULL,
    working_hours_start TIME NOT NULL,
    working_hours_end TIME NOT NULL,
    outage_mode_working_hours ENUM('LOCAL_PRIORITY','ONLINE_PRIORITY','BLOCK_ALL') NOT NULL DEFAULT 'LOCAL_PRIORITY',
    outage_mode_off_hours ENUM('LOCAL_PRIORITY','ONLINE_PRIORITY','BLOCK_ALL') NOT NULL DEFAULT 'ONLINE_PRIORITY',
    lead_time_cutoff_min INT NOT NULL DEFAULT 120,
    heartbeat_status ENUM('ONLINE','OFFLINE','RECOVERING') NOT NULL DEFAULT 'OFFLINE',
    current_authority ENUM('LOCAL','ONLINE','BLOCKED') NOT NULL DEFAULT 'BLOCKED',
    recovery_state ENUM('LIVE','RECOVERING','OFFLINE') NOT NULL DEFAULT 'OFFLINE',
    sync_pending_count INT NOT NULL DEFAULT 0,
    sync_success_count INT NOT NULL DEFAULT 0,
    sync_failed_count INT NOT NULL DEFAULT 0,
    sync_conflict_count INT NOT NULL DEFAULT 0,
    last_sync_at TIMESTAMP NULL DEFAULT NULL,
    last_heartbeat_at TIMESTAMP NULL DEFAULT NULL,
    app_healthy BOOLEAN NOT NULL DEFAULT FALSE,
    db_healthy BOOLEAN NOT NULL DEFAULT FALSE,
    booking_api_healthy BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`);
  for (const q of [
    `ALTER TABLE theatres ADD COLUMN recovery_state ENUM('LIVE','RECOVERING','OFFLINE') NOT NULL DEFAULT 'OFFLINE'`,
    `ALTER TABLE theatres ADD COLUMN sync_pending_count INT NOT NULL DEFAULT 0`,
    `ALTER TABLE theatres ADD COLUMN sync_success_count INT NOT NULL DEFAULT 0`,
    `ALTER TABLE theatres ADD COLUMN sync_failed_count INT NOT NULL DEFAULT 0`,
    `ALTER TABLE theatres ADD COLUMN sync_conflict_count INT NOT NULL DEFAULT 0`,
    `ALTER TABLE theatres ADD COLUMN last_sync_at TIMESTAMP NULL DEFAULT NULL`
  ]) await db.query(q).catch(()=>{});

  await db.query(`CREATE TABLE IF NOT EXISTS bookings (
    booking_id VARCHAR(120) PRIMARY KEY,
    ticket_number VARCHAR(120) NOT NULL UNIQUE,
    theatre_id VARCHAR(80) NOT NULL,
    show_id VARCHAR(80) NOT NULL,
    movie_title VARCHAR(150) NOT NULL,
    theatre_name VARCHAR(150) NOT NULL,
    show_time_utc DATETIME NOT NULL,
    show_label VARCHAR(120) NULL,
    total_tickets INT NOT NULL,
    seats_json JSON NOT NULL,
    pricing_json JSON NULL,
    booking_source VARCHAR(40) NOT NULL,
    booking_status VARCHAR(20) NOT NULL DEFAULT 'HELD',
    reconciliation_status VARCHAR(20) NOT NULL DEFAULT 'NOT_SYNCED',
    payment_mode VARCHAR(20) NULL,
    hold_id VARCHAR(120) NULL,
    session_id VARCHAR(120) NULL,
    idempotency_key VARCHAR(180) NULL,
    request_ip VARCHAR(100) NULL,
    print_ip VARCHAR(100) NULL,
    source_label VARCHAR(200) NULL,
    held_at_utc DATETIME NULL,
    confirmed_at_utc DATETIME NULL,
    synced_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_central_idempotency (idempotency_key)
  )`);
  for (const q of [
    `ALTER TABLE bookings ADD COLUMN pricing_json JSON NULL`,
    `ALTER TABLE bookings ADD COLUMN payment_mode VARCHAR(20) NULL`,
    `ALTER TABLE bookings ADD COLUMN print_ip VARCHAR(100) NULL`,
    `ALTER TABLE bookings ADD COLUMN show_label VARCHAR(120) NULL`
  ]) await db.query(q).catch(()=>{});

  await db.query(`CREATE TABLE IF NOT EXISTS pending_transactions (
    session_id VARCHAR(120) PRIMARY KEY,
    booking_id VARCHAR(120) NULL UNIQUE,
    theatre_id VARCHAR(80) NOT NULL,
    show_id VARCHAR(80) NOT NULL,
    authority_when_started VARCHAR(20) NOT NULL,
    transaction_state VARCHAR(30) NOT NULL DEFAULT 'PENDING_CONFIRMATION',
    idempotency_key VARCHAR(180) NULL,
    notes TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME NULL
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS sync_journal (
    event_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    booking_id VARCHAR(120) NOT NULL,
    direction VARCHAR(30) NOT NULL,
    event_type VARCHAR(40) NOT NULL,
    event_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    payload_json JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME NULL,
    KEY idx_sync_booking (booking_id)
  )`);
  const theatreId = process.env.THEATRE_ID || 'KSFDC_SREE_TVM';
  await db.query(
    `INSERT INTO theatres (
      theatre_id, name, city, local_public_url, working_hours_start, working_hours_end,
      outage_mode_working_hours, outage_mode_off_hours, lead_time_cutoff_min,
      heartbeat_status, current_authority, recovery_state, last_heartbeat_at, app_healthy, db_healthy, booking_api_healthy
    ) VALUES (?, 'KSFDC Sree, TVM', 'Thiruvananthapuram', ?, '09:00:00', '23:00:00',
      'LOCAL_PRIORITY', 'ONLINE_PRIORITY', 120, 'OFFLINE', 'BLOCKED', 'OFFLINE', NULL, FALSE, FALSE, FALSE)
    ON DUPLICATE KEY UPDATE name = VALUES(name), city = VALUES(city), working_hours_start = VALUES(working_hours_start), working_hours_end = VALUES(working_hours_end), outage_mode_working_hours = VALUES(outage_mode_working_hours), outage_mode_off_hours = VALUES(outage_mode_off_hours), lead_time_cutoff_min = VALUES(lead_time_cutoff_min)`,
    [theatreId, process.env.LOCAL_PUBLIC_URL || 'http://localhost:3000']
  );
}

export async function readMysqlStore() {
  await ensureCentralSchema();
  const db = getDb();
  const [theatreRowsRaw] = await db.query('SELECT * FROM theatres ORDER BY theatre_id');
  const [bookingRowsRaw] = await db.query('SELECT * FROM bookings ORDER BY created_at DESC');
  const [pendingRowsRaw] = await db.query('SELECT * FROM pending_transactions ORDER BY created_at DESC');
  const theatreRows = Array.isArray(theatreRowsRaw) ? (theatreRowsRaw as any[]) : [];
  const bookingRows = Array.isArray(bookingRowsRaw) ? (bookingRowsRaw as any[]) : [];
  const pendingRows = Array.isArray(pendingRowsRaw) ? (pendingRowsRaw as any[]) : [];
  return {
    theatres: theatreRows.map((r:any) => ({
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
      recoveryState: r.recovery_state || 'OFFLINE',
      syncPendingCount: Number(r.sync_pending_count || 0),
      syncSuccessCount: Number(r.sync_success_count || 0),
      syncFailedCount: Number(r.sync_failed_count || 0),
      syncConflictCount: Number(r.sync_conflict_count || 0),
      lastSyncAt: toIso(r.last_sync_at),
      lastHeartbeatAt: toIso(r.last_heartbeat_at),
      updatedAt: toIso(r.updated_at),
      health: { appHealthy: !!r.app_healthy, dbHealthy: !!r.db_healthy, bookingApiHealthy: !!r.booking_api_healthy }
    } as Theatre)),
    bookings: bookingRows.map((r:any) => ({
      bookingId: r.booking_id,
      ticketNumber: r.ticket_number,
      theatreId: r.theatre_id,
      showId: r.show_id,
      movieTitle: r.movie_title,
      theatreName: r.theatre_name,
      showTimeUtc: toIso(r.show_time_utc)!,
      showLabel: r.show_label || null,
      totalTickets: r.total_tickets,
      seats:
        typeof r.seats_json === 'string'
          ? JSON.parse(r.seats_json || '[]')
          : r.seats_json ?? [],
      pricing:
        typeof r.pricing_json === 'string'
          ? JSON.parse(r.pricing_json)
          : r.pricing_json ?? null,
      bookingSource: r.booking_source,
      bookingStatus: r.booking_status,
      reconciliationStatus: r.reconciliation_status,
      paymentMode: r.payment_mode || null,
      holdId: r.hold_id,
      sessionId: r.session_id,
      idempotencyKey: r.idempotency_key,
      requestIp: r.request_ip,
      printIp: r.print_ip,
      sourceLabel: r.source_label,
      heldAtUtc: toIso(r.held_at_utc),
      confirmedAtUtc: toIso(r.confirmed_at_utc),
      syncedAt: toIso(r.synced_at),
      createdAt: toIso(r.created_at)
    })),
    pending: pendingRows,
  };
}

export async function upsertHeartbeat(theatreId: string, payload: { appHealthy: boolean; dbHealthy: boolean; bookingApiHealthy: boolean; syncPendingCount?: number; syncSuccessCount?: number; syncFailedCount?: number; syncConflictCount?: number; recoveryReady?: boolean; }) {
  const db = getDb();
  await ensureCentralSchema();
  const syncPending = Number(payload.syncPendingCount || 0);
  const recoveryState = syncPending > 0 || !payload.recoveryReady ? 'RECOVERING' : 'LIVE';
  const heartbeatStatus = recoveryState === 'RECOVERING' ? 'RECOVERING' : 'ONLINE';
  await db.query(
    `UPDATE theatres
     SET heartbeat_status = ?,
         current_authority = 'LOCAL',
         recovery_state = ?,
         sync_pending_count = ?,
         sync_success_count = ?,
         sync_failed_count = ?,
         sync_conflict_count = ?,
         last_sync_at = UTC_TIMESTAMP(),
         last_heartbeat_at = UTC_TIMESTAMP(),
         app_healthy = ?, db_healthy = ?, booking_api_healthy = ?, updated_at = CURRENT_TIMESTAMP
     WHERE theatre_id = ?`,
    [heartbeatStatus, recoveryState, syncPending, Number(payload.syncSuccessCount||0), Number(payload.syncFailedCount||0), Number(payload.syncConflictCount||0), payload.appHealthy?1:0, payload.dbHealthy?1:0, payload.bookingApiHealthy?1:0, theatreId]
  );
}

export async function markTimedOutTheatres(timeoutSeconds: number) {
  const db = getDb();
  await ensureCentralSchema();
  await db.query(
    `UPDATE theatres
     SET heartbeat_status = 'OFFLINE', recovery_state='OFFLINE', updated_at = CURRENT_TIMESTAMP
     WHERE last_heartbeat_at IS NULL OR TIMESTAMPDIFF(SECOND, last_heartbeat_at, UTC_TIMESTAMP()) > ?`,
    [timeoutSeconds]
  );
}

export async function saveCentralBooking(rec: any) {
  const db = getDb();
  await ensureCentralSchema();
  await db.query(
    `INSERT INTO bookings (
      booking_id, ticket_number, theatre_id, show_id, movie_title, theatre_name, show_time_utc, show_label,
      total_tickets, seats_json, pricing_json, booking_source, booking_status, reconciliation_status,
      payment_mode, hold_id, session_id, idempotency_key, request_ip, print_ip, source_label, held_at_utc, confirmed_at_utc, synced_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())
    ON DUPLICATE KEY UPDATE booking_status = VALUES(booking_status), reconciliation_status = VALUES(reconciliation_status), payment_mode=VALUES(payment_mode), pricing_json=VALUES(pricing_json), confirmed_at_utc = VALUES(confirmed_at_utc), synced_at = VALUES(synced_at), request_ip = VALUES(request_ip), print_ip=VALUES(print_ip), source_label = VALUES(source_label), booking_source=VALUES(booking_source)`,
    [
      rec.bookingId, rec.ticketNumber, rec.theatreId, rec.showId, rec.movieTitle, rec.theatreName,
      rec.showTimeUtc.slice(0,19).replace('T',' '), rec.showLabel || null,
      rec.totalTickets, JSON.stringify(rec.seats), rec.pricing ? JSON.stringify(rec.pricing) : null,
      rec.bookingSource, rec.bookingStatus, rec.reconciliationStatus, rec.paymentMode || null,
      rec.holdId, rec.sessionId, rec.idempotencyKey, rec.requestIp, rec.printIp || null, rec.sourceLabel,
      rec.heldAtUtc ? rec.heldAtUtc.slice(0,19).replace('T',' ') : null,
      rec.confirmedAtUtc ? rec.confirmedAtUtc.slice(0,19).replace('T',' ') : null,
    ]
  );
}

export async function createPendingTransaction(rec: { sessionId: string; bookingId?: string | null; theatreId: string; showId: string; authorityWhenStarted: string; idempotencyKey?: string | null; notes?: string | null; }) {
  const db = getDb();
  await ensureCentralSchema();
  await db.query(
    `INSERT INTO pending_transactions (session_id, booking_id, theatre_id, show_id, authority_when_started, transaction_state, idempotency_key, notes, created_at)
     VALUES (?, ?, ?, ?, ?, 'PENDING_CONFIRMATION', ?, ?, UTC_TIMESTAMP())
     ON DUPLICATE KEY UPDATE authority_when_started = VALUES(authority_when_started), idempotency_key = VALUES(idempotency_key), notes = VALUES(notes)`,
    [rec.sessionId, rec.bookingId || null, rec.theatreId, rec.showId, rec.authorityWhenStarted, rec.idempotencyKey || null, rec.notes || null]
  );
}

export async function resolvePendingTransaction(sessionId: string, state: 'CONFIRMED' | 'FAILED' | 'EXPIRED', notes?: string | null, bookingId?: string | null) {
  const db = getDb();
  await ensureCentralSchema();
  await db.query(`UPDATE pending_transactions SET transaction_state = ?, notes = ?, resolved_at = UTC_TIMESTAMP(), booking_id = COALESCE(?, booking_id) WHERE session_id = ?`, [state, notes || null, bookingId || null, sessionId]);
}
