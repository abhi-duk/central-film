import { getDb, rows } from './db';
import { rebuildShowRuntimeSnapshot } from './snapshot';

export async function ensureCentralSchemaAndSeed() {
  const db = getDb();
  await db.query(`CREATE TABLE IF NOT EXISTS theatres (
    theatre_id VARCHAR(80) PRIMARY KEY,
    theatre_name VARCHAR(150) NOT NULL,
    district VARCHAR(80) NOT NULL DEFAULT 'Thiruvananthapuram',
    authority_mode VARCHAR(20) NOT NULL DEFAULT 'LOCAL',
    app_healthy TINYINT(1) NOT NULL DEFAULT 0,
    db_healthy TINYINT(1) NOT NULL DEFAULT 0,
    booking_api_healthy TINYINT(1) NOT NULL DEFAULT 0,
    sync_pending_count INT NOT NULL DEFAULT 0,
    sync_success_count INT NOT NULL DEFAULT 0,
    sync_failed_count INT NOT NULL DEFAULT 0,
    sync_conflict_count INT NOT NULL DEFAULT 0,
    last_heartbeat_utc DATETIME NULL,
    updated_at_utc DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS shows (
    show_id VARCHAR(80) PRIMARY KEY,
    theatre_id VARCHAR(80) NOT NULL,
    theatre_name VARCHAR(150) NOT NULL,
    movie_title VARCHAR(150) NOT NULL,
    screen_name VARCHAR(80) NOT NULL DEFAULT 'Screen 1',
    show_time_utc DATETIME NOT NULL,
    premium_rate DECIMAL(10,2) NOT NULL DEFAULT 220.00,
    executive_rate DECIMAL(10,2) NOT NULL DEFAULT 160.00,
    economy_rate DECIMAL(10,2) NOT NULL DEFAULT 120.00,
    created_at_utc DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS pricing_config (
    config_id TINYINT PRIMARY KEY,
    gst_pct DECIMAL(5,2) NOT NULL DEFAULT 12.00,
    entertainment_tax_pct DECIMAL(5,2) NOT NULL DEFAULT 5.00,
    cess_pct DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    updated_at_utc DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS booking_policies (
    policy_id TINYINT PRIMARY KEY,
    hold_seconds INT NOT NULL DEFAULT 90,
    heartbeat_timeout_seconds INT NOT NULL DEFAULT 30,
    allow_central_when_local_offline TINYINT(1) NOT NULL DEFAULT 1,
    block_online_when_local_live TINYINT(1) NOT NULL DEFAULT 1,
    updated_at_utc DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS show_seats (
    show_id VARCHAR(80) NOT NULL,
    seat_id VARCHAR(20) NOT NULL,
    seat_class VARCHAR(20) NOT NULL DEFAULT 'ECONOMY',
    seat_status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    hold_id VARCHAR(120) NULL,
    booking_id VARCHAR(120) NULL,
    hold_expires_at_utc DATETIME NULL,
    updated_at_utc DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (show_id, seat_id),
    KEY idx_show_seat_status (show_id, seat_status),
    KEY idx_show_hold (show_id, hold_id)
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS seat_holds (
    hold_id VARCHAR(120) PRIMARY KEY,
    transaction_id VARCHAR(120) NOT NULL UNIQUE,
    theatre_id VARCHAR(80) NOT NULL,
    show_id VARCHAR(80) NOT NULL,
    seat_ids_json LONGTEXT NOT NULL,
    pricing_json LONGTEXT NULL,
    hold_source VARCHAR(40) NOT NULL DEFAULT 'CENTRAL_ONLINE',
    hold_status VARCHAR(20) NOT NULL DEFAULT 'HELD',
    payment_mode VARCHAR(20) NULL,
    request_ip VARCHAR(100) NULL,
    source_label VARCHAR(200) NULL,
    held_at_utc DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at_utc DATETIME NOT NULL,
    confirmed_at_utc DATETIME NULL,
    released_at_utc DATETIME NULL,
    KEY idx_holds_show_status (show_id, hold_status),
    KEY idx_holds_expiry (expires_at_utc)
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS central_bookings (
    booking_id VARCHAR(120) PRIMARY KEY,
    ticket_number VARCHAR(120) NOT NULL UNIQUE,
    theatre_id VARCHAR(80) NOT NULL,
    show_id VARCHAR(80) NOT NULL,
    movie_title VARCHAR(150) NOT NULL,
    theatre_name VARCHAR(150) NOT NULL,
    show_time_utc DATETIME NOT NULL,
    show_label VARCHAR(120) NULL,
    seats_json LONGTEXT NOT NULL,
    pricing_json LONGTEXT NULL,
    total_tickets INT NOT NULL,
    booking_source VARCHAR(40) NOT NULL,
    booking_status VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED',
    reconciliation_status VARCHAR(20) NOT NULL DEFAULT 'CENTRAL_CONFIRMED',
    payment_mode VARCHAR(20) NULL,
    hold_id VARCHAR(120) NULL,
    session_id VARCHAR(120) NULL,
    idempotency_key VARCHAR(180) NULL,
    request_ip VARCHAR(100) NULL,
    source_label VARCHAR(200) NULL,
    confirmed_at_utc DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    synced_at_utc DATETIME NULL,
    created_at_utc DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_central_bookings_show (show_id, created_at_utc),
    KEY idx_central_bookings_source (booking_source, created_at_utc)
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS booking_seats (
    booking_id VARCHAR(120) NOT NULL,
    show_id VARCHAR(80) NOT NULL,
    seat_id VARCHAR(20) NOT NULL,
    created_at_utc DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (show_id, seat_id),
    KEY idx_booking_id (booking_id)
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS payment_transactions (
    transaction_id VARCHAR(120) PRIMARY KEY,
    hold_id VARCHAR(120) NOT NULL,
    show_id VARCHAR(80) NOT NULL,
    transaction_state VARCHAR(30) NOT NULL DEFAULT 'PENDING_CONFIRMATION',
    amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at_utc DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    confirmed_at_utc DATETIME NULL,
    KEY idx_payment_hold (hold_id)
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS show_runtime_snapshot (
    show_id VARCHAR(80) PRIMARY KEY,
    version_no BIGINT NOT NULL DEFAULT 1,
    seat_map_json LONGTEXT NOT NULL,
    pricing_json LONGTEXT NOT NULL,
    available_count INT NOT NULL DEFAULT 0,
    held_count INT NOT NULL DEFAULT 0,
    booked_count INT NOT NULL DEFAULT 0,
    updated_at_utc DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS local_booking_sync (
    booking_id VARCHAR(120) PRIMARY KEY,
    theatre_id VARCHAR(80) NOT NULL,
    show_id VARCHAR(80) NOT NULL,
    payload_json LONGTEXT NOT NULL,
    sync_status VARCHAR(30) NOT NULL DEFAULT 'RECEIVED',
    conflict_reason VARCHAR(255) NULL,
    received_at_utc DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);

  await db.query(`INSERT INTO booking_policies(policy_id,hold_seconds,heartbeat_timeout_seconds,allow_central_when_local_offline,block_online_when_local_live)
    VALUES(1,90,30,1,1)
    ON DUPLICATE KEY UPDATE policy_id=policy_id`);

  await db.query(`INSERT INTO pricing_config(config_id,gst_pct,entertainment_tax_pct,cess_pct)
    VALUES(1,12.00,5.00,1.00)
    ON DUPLICATE KEY UPDATE config_id=config_id`);

  const theatreId = process.env.THEATRE_ID || 'KSFDC_SREE_TVM';
  const theatreName = 'KSFDC Sree, TVM';
  await db.query(`INSERT INTO theatres (theatre_id, theatre_name, district, authority_mode)
    VALUES (?, ?, 'Thiruvananthapuram', 'LOCAL')
    ON DUPLICATE KEY UPDATE theatre_name=VALUES(theatre_name)`, [theatreId, theatreName]);

  await db.query(`INSERT INTO shows (show_id, theatre_id, theatre_name, movie_title, screen_name, show_time_utc, premium_rate, executive_rate, economy_rate)
    VALUES ('SHOW_EMP_001', ?, ?, 'L2: Empuraan', 'Screen 1', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 2 HOUR), 260, 190, 130)
    ON DUPLICATE KEY UPDATE theatre_id=VALUES(theatre_id), theatre_name=VALUES(theatre_name), premium_rate=VALUES(premium_rate), executive_rate=VALUES(executive_rate), economy_rate=VALUES(economy_rate)`, [theatreId, theatreName]);
  await db.query(`INSERT INTO shows (show_id, theatre_id, theatre_name, movie_title, screen_name, show_time_utc, premium_rate, executive_rate, economy_rate)
    VALUES ('SHOW_OD_001', ?, ?, 'Officer on Duty', 'Screen 1', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 4 HOUR), 220, 170, 120)
    ON DUPLICATE KEY UPDATE theatre_id=VALUES(theatre_id), theatre_name=VALUES(theatre_name), premium_rate=VALUES(premium_rate), executive_rate=VALUES(executive_rate), economy_rate=VALUES(economy_rate)`, [theatreId, theatreName]);

  const [countRows] = await db.query(`SELECT COUNT(*) AS cnt FROM show_seats WHERE show_id IN ('SHOW_EMP_001','SHOW_OD_001')`);
  const count = Number(rows<any>(countRows)[0]?.cnt || 0);
  if (count < 320) {
    for (const showId of ['SHOW_EMP_001', 'SHOW_OD_001']) {
      for (const row of 'ABCDEFGHIJ'.split('')) {
        for (let i = 1; i <= 16; i++) {
          const seatClass = ['A','B','C'].includes(row) ? 'PREMIUM' : ['D','E','F'].includes(row) ? 'EXECUTIVE' : 'ECONOMY';
          await db.query(`INSERT IGNORE INTO show_seats (show_id, seat_id, seat_class, seat_status) VALUES (?, ?, ?, 'AVAILABLE')`, [showId, `${row}${i}`, seatClass]);
        }
      }
    }
  }

  await rebuildShowRuntimeSnapshot('SHOW_EMP_001');
  await rebuildShowRuntimeSnapshot('SHOW_OD_001');
}
