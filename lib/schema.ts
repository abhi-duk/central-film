
import { getDb } from './db';

export async function ensureSchema() {
  const db = getDb();
  await db.query(`
    CREATE TABLE IF NOT EXISTS theatres (
      theatre_id VARCHAR(80) PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      city VARCHAR(100) NOT NULL,
      local_public_url TEXT NULL,
      working_hours_start TIME NOT NULL,
      working_hours_end TIME NOT NULL,
      outage_mode_working_hours VARCHAR(30) NOT NULL DEFAULT 'LOCAL_PRIORITY',
      outage_mode_off_hours VARCHAR(30) NOT NULL DEFAULT 'ONLINE_PRIORITY',
      lead_time_cutoff_min INT NOT NULL DEFAULT 120,
      heartbeat_status VARCHAR(20) NOT NULL DEFAULT 'OFFLINE',
      current_authority VARCHAR(20) NOT NULL DEFAULT 'BLOCKED',
      last_heartbeat_at DATETIME NULL,
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
      ticket_number VARCHAR(120) NULL,
      theatre_id VARCHAR(80) NOT NULL,
      show_id VARCHAR(80) NOT NULL,
      movie_title VARCHAR(150) NOT NULL,
      theatre_name VARCHAR(150) NOT NULL,
      seats_json TEXT NOT NULL,
      total_tickets INT NOT NULL,
      show_time VARCHAR(40) NULL,
      booking_mode VARCHAR(20) NULL,
      source VARCHAR(40) NOT NULL,
      status VARCHAR(30) NOT NULL,
      hold_id VARCHAR(120) NULL,
      session_id VARCHAR(120) NULL,
      idempotency_key VARCHAR(180) NULL,
      request_ip VARCHAR(100) NULL,
      source_label VARCHAR(200) NULL,
      synced_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS pending_transactions (
      session_id VARCHAR(120) PRIMARY KEY,
      booking_id VARCHAR(120) NULL,
      theatre_id VARCHAR(80) NOT NULL,
      show_id VARCHAR(80) NOT NULL,
      authority_when_started VARCHAR(20) NOT NULL,
      state VARCHAR(30) NOT NULL,
      notes TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME NULL
    )
  `);
}
