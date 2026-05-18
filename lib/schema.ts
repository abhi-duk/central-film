import { getDb } from './db';

let ready = false;
export async function ensureSchema() {
  if (ready) return;
  const db = getDb();
  await db.query(`
    CREATE TABLE IF NOT EXISTS theatres (
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
      last_heartbeat_at TIMESTAMP NULL DEFAULT NULL,
      app_healthy BOOLEAN NOT NULL DEFAULT FALSE,
      db_healthy BOOLEAN NOT NULL DEFAULT FALSE,
      booking_api_healthy BOOLEAN NOT NULL DEFAULT FALSE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS bookings (
      booking_id VARCHAR(120) PRIMARY KEY,
      ticket_number VARCHAR(120) NOT NULL UNIQUE,
      theatre_id VARCHAR(80) NOT NULL,
      show_id VARCHAR(80) NOT NULL,
      movie_title VARCHAR(150) NOT NULL,
      theatre_name VARCHAR(150) NOT NULL,
      show_time_utc DATETIME NOT NULL,
      total_tickets INT NOT NULL,
      seats_json LONGTEXT NOT NULL,
      booking_source VARCHAR(40) NOT NULL,
      booking_status VARCHAR(20) NOT NULL DEFAULT 'HELD',
      reconciliation_status VARCHAR(20) NOT NULL DEFAULT 'NOT_SYNCED',
      hold_id VARCHAR(120) NULL,
      session_id VARCHAR(120) NULL,
      idempotency_key VARCHAR(180) NULL,
      request_ip VARCHAR(100) NULL,
      source_label VARCHAR(200) NULL,
      held_at_utc DATETIME NULL,
      confirmed_at_utc DATETIME NULL,
      synced_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_booking_idem (idempotency_key)
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS pending_transactions (
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
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS sync_journal (
      event_id BIGINT AUTO_INCREMENT PRIMARY KEY,
      booking_id VARCHAR(120) NOT NULL,
      direction VARCHAR(30) NOT NULL,
      event_type VARCHAR(40) NOT NULL,
      event_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
      payload_json LONGTEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      processed_at DATETIME NULL,
      KEY idx_sync_booking (booking_id)
    )
  `);
  await db.query(`
    INSERT INTO theatres (
      theatre_id, name, city, local_public_url, working_hours_start, working_hours_end,
      outage_mode_working_hours, outage_mode_off_hours, lead_time_cutoff_min,
      heartbeat_status, current_authority, app_healthy, db_healthy, booking_api_healthy
    ) VALUES ('KSFDC_SREE_TVM','KSFDC Sree, TVM','Thiruvananthapuram', ?, '09:00:00','23:00:00','LOCAL_PRIORITY','ONLINE_PRIORITY',120,'OFFLINE','BLOCKED',0,0,0)
    ON DUPLICATE KEY UPDATE name=VALUES(name), city=VALUES(city)
  `,[process.env.LOCAL_PUBLIC_URL || 'http://localhost:3000']);
  ready = true;
}
