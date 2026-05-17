import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';

export type OutageMode = 'LOCAL_PRIORITY' | 'ONLINE_PRIORITY' | 'BLOCK_ALL';
export type Authority = 'LOCAL' | 'ONLINE' | 'BLOCKED';
export type HeartbeatStatus = 'ONLINE' | 'OFFLINE' | 'RECOVERING';

export type Theatre = {
  theatreId: string;
  name: string;
  city: string;
  localPublicUrl: string;
  workingHoursStart: string;
  workingHoursEnd: string;
  outageModeWorkingHours: OutageMode;
  outageModeOffHours: OutageMode;
  leadTimeCutoffMin: number;
  heartbeatStatus: HeartbeatStatus;
  currentAuthority: Authority;
  lastHeartbeatAt: string | null;
  updatedAt: string | null;
  health: {
    appHealthy: boolean;
    dbHealthy: boolean;
    bookingApiHealthy: boolean;
  };
};

export type Booking = {
  bookingId: string;
  theatreId: string;
  showId: string;
  movieTitle: string;
  theatreName: string;
  seats: string[];
  totalTickets: number;
  showTime?: string | null;
  bookingMode?: 'ONLINE' | 'OFFLINE';
  source: 'AUDIT_COPY' | 'ONLINE_OUTAGE_MODE' | 'PENDING_RECOVERY';
  status: 'PENDING' | 'CONFIRMED' | 'FAILED' | 'RECONCILED';
  createdAt: string;
  syncedAt?: string | null;
  note?: string;
  requestIp?: string | null;
  sourceLabel?: string;
};

export type PendingTransaction = {
  sessionId: string;
  theatreId: string;
  showId: string;
  authorityWhenStarted: Authority;
  state: 'PENDING_CONFIRMATION' | 'CONFIRMED' | 'FAILED';
  notes?: string;
  createdAt: string;
  resolvedAt?: string | null;
};

export type Store = {
  theatres: Theatre[];
  bookings: Booking[];
  pending: PendingTransaction[];
};

const dataDir = path.join(process.cwd(), 'data');
const dataPath = path.join(dataDir, 'store.json');
const seedPath = path.join(dataDir, 'store.seed.json');

const seedStore: Store = {
  theatres: [{
    theatreId: 'KSFDC_SREE_TVM',
    name: 'KSFDC Sree, TVM',
    city: 'Thiruvananthapuram',
    localPublicUrl: process.env.LOCAL_PUBLIC_URL || 'http://localhost:3000',
    workingHoursStart: '09:00',
    workingHoursEnd: '23:00',
    outageModeWorkingHours: 'LOCAL_PRIORITY',
    outageModeOffHours: 'ONLINE_PRIORITY',
    leadTimeCutoffMin: 120,
    heartbeatStatus: 'OFFLINE',
    currentAuthority: 'BLOCKED',
    lastHeartbeatAt: null,
    updatedAt: null,
    health: { appHealthy: false, dbHealthy: false, bookingApiHealthy: false },
  }],
  bookings: [],
  pending: [],
};

let pool: mysql.Pool | null = null;
let initialized = false;

function useMysql() {
  return !!process.env.DB_HOST;
}

function ensureFiles() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(seedPath)) fs.writeFileSync(seedPath, JSON.stringify(seedStore, null, 2));
  if (!fs.existsSync(dataPath)) fs.copyFileSync(seedPath, dataPath);
}

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 5,
      ssl: process.env.DB_SSL === 'false' ? undefined : { rejectUnauthorized: false },
    });
  }
  return pool;
}

async function initMysql() {
  if (!useMysql() || initialized) return;
  const db = getPool();
  await db.query(`CREATE TABLE IF NOT EXISTS theatres (
    theatre_id VARCHAR(80) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    city VARCHAR(100) NOT NULL,
    local_public_url TEXT NOT NULL,
    working_hours_start VARCHAR(10) NOT NULL,
    working_hours_end VARCHAR(10) NOT NULL,
    outage_mode_working_hours VARCHAR(30) NOT NULL,
    outage_mode_off_hours VARCHAR(30) NOT NULL,
    lead_time_cutoff_min INT NOT NULL,
    heartbeat_status VARCHAR(20) NOT NULL,
    current_authority VARCHAR(20) NOT NULL,
    last_heartbeat_at DATETIME NULL,
    updated_at DATETIME NULL,
    app_healthy BOOLEAN NOT NULL DEFAULT FALSE,
    db_healthy BOOLEAN NOT NULL DEFAULT FALSE,
    booking_api_healthy BOOLEAN NOT NULL DEFAULT FALSE
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS bookings (
    booking_id VARCHAR(100) PRIMARY KEY,
    theatre_id VARCHAR(80) NOT NULL,
    show_id VARCHAR(80) NOT NULL,
    movie_title VARCHAR(150) NOT NULL,
    theatre_name VARCHAR(150) NOT NULL,
    seats_json JSON NOT NULL,
    total_tickets INT NOT NULL,
    show_time VARCHAR(40) NULL,
    booking_mode VARCHAR(20) NULL,
    source VARCHAR(40) NOT NULL,
    status VARCHAR(30) NOT NULL,
    created_at DATETIME NOT NULL,
    synced_at DATETIME NULL,
    note TEXT NULL,
    request_ip VARCHAR(80) NULL,
    source_label VARCHAR(200) NULL
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS pending_transactions (
    session_id VARCHAR(100) PRIMARY KEY,
    theatre_id VARCHAR(80) NOT NULL,
    show_id VARCHAR(80) NOT NULL,
    authority_when_started VARCHAR(20) NOT NULL,
    state VARCHAR(30) NOT NULL,
    notes TEXT NULL,
    created_at DATETIME NOT NULL,
    resolved_at DATETIME NULL
  )`);
  const [rows] = await db.query<any[]>('SELECT COUNT(*) AS c FROM theatres');
  if (!rows[0]?.c) {
    const t = seedStore.theatres[0];
    await db.query(`INSERT INTO theatres (
      theatre_id,name,city,local_public_url,working_hours_start,working_hours_end,
      outage_mode_working_hours,outage_mode_off_hours,lead_time_cutoff_min,
      heartbeat_status,current_authority,last_heartbeat_at,updated_at,
      app_healthy,db_healthy,booking_api_healthy
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
      t.theatreId,t.name,t.city,t.localPublicUrl,t.workingHoursStart,t.workingHoursEnd,
      t.outageModeWorkingHours,t.outageModeOffHours,t.leadTimeCutoffMin,
      t.heartbeatStatus,t.currentAuthority,null,null,
      t.health.appHealthy,t.health.dbHealthy,t.health.bookingApiHealthy,
    ]);
  }
  initialized = true;
}

function readJsonStore(): Store {
  ensureFiles();
  return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
}

function writeJsonStore(store: Store) {
  ensureFiles();
  fs.writeFileSync(dataPath, JSON.stringify(store, null, 2));
}

async function readMysqlStore(): Promise<Store> {
  await initMysql();
  const db = getPool();
  const [theatreRows] = await db.query<any[]>('SELECT * FROM theatres ORDER BY theatre_id');
  const [bookingRows] = await db.query<any[]>('SELECT * FROM bookings ORDER BY created_at DESC');
  const [pendingRows] = await db.query<any[]>('SELECT * FROM pending_transactions ORDER BY created_at DESC');
  return {
    theatres: theatreRows.map(r => ({
      theatreId: r.theatre_id,
      name: r.name,
      city: r.city,
      localPublicUrl: r.local_public_url,
      workingHoursStart: r.working_hours_start,
      workingHoursEnd: r.working_hours_end,
      outageModeWorkingHours: r.outage_mode_working_hours,
      outageModeOffHours: r.outage_mode_off_hours,
      leadTimeCutoffMin: r.lead_time_cutoff_min,
      heartbeatStatus: r.heartbeat_status,
      currentAuthority: r.current_authority,
      lastHeartbeatAt: r.last_heartbeat_at ? new Date(r.last_heartbeat_at).toISOString() : null,
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : null,
      health: {
        appHealthy: !!r.app_healthy,
        dbHealthy: !!r.db_healthy,
        bookingApiHealthy: !!r.booking_api_healthy,
      },
    })),
    bookings: bookingRows.map(r => ({
      bookingId: r.booking_id,
      theatreId: r.theatre_id,
      showId: r.show_id,
      movieTitle: r.movie_title,
      theatreName: r.theatre_name,
      seats: Array.isArray(r.seats_json) ? r.seats_json : JSON.parse(r.seats_json || '[]'),
      totalTickets: r.total_tickets,
      showTime: r.show_time,
      bookingMode: r.booking_mode,
      source: r.source,
      status: r.status,
      createdAt: new Date(r.created_at).toISOString(),
      syncedAt: r.synced_at ? new Date(r.synced_at).toISOString() : null,
      note: r.note,
      requestIp: r.request_ip,
      sourceLabel: r.source_label,
    })),
    pending: pendingRows.map(r => ({
      sessionId: r.session_id,
      theatreId: r.theatre_id,
      showId: r.show_id,
      authorityWhenStarted: r.authority_when_started,
      state: r.state,
      notes: r.notes,
      createdAt: new Date(r.created_at).toISOString(),
      resolvedAt: r.resolved_at ? new Date(r.resolved_at).toISOString() : null,
    })),
  };
}

async function writeMysqlStore(store: Store) {
  await initMysql();
  const db = getPool();
  await db.query('DELETE FROM pending_transactions');
  await db.query('DELETE FROM bookings');
  await db.query('DELETE FROM theatres');
  for (const t of store.theatres) {
    await db.query(`INSERT INTO theatres (
      theatre_id,name,city,local_public_url,working_hours_start,working_hours_end,
      outage_mode_working_hours,outage_mode_off_hours,lead_time_cutoff_min,
      heartbeat_status,current_authority,last_heartbeat_at,updated_at,
      app_healthy,db_healthy,booking_api_healthy
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
      t.theatreId,t.name,t.city,t.localPublicUrl,t.workingHoursStart,t.workingHoursEnd,
      t.outageModeWorkingHours,t.outageModeOffHours,t.leadTimeCutoffMin,
      t.heartbeatStatus,t.currentAuthority,
      t.lastHeartbeatAt ? new Date(t.lastHeartbeatAt) : null,
      t.updatedAt ? new Date(t.updatedAt) : null,
      t.health.appHealthy,t.health.dbHealthy,t.health.bookingApiHealthy,
    ]);
  }
  for (const b of store.bookings) {
    await db.query(`INSERT INTO bookings (
      booking_id,theatre_id,show_id,movie_title,theatre_name,seats_json,total_tickets,
      show_time,booking_mode,source,status,created_at,synced_at,note,request_ip,source_label
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
      b.bookingId,b.theatreId,b.showId,b.movieTitle,b.theatreName,JSON.stringify(b.seats),b.totalTickets,
      b.showTime || null,b.bookingMode || null,b.source,b.status,new Date(b.createdAt),
      b.syncedAt ? new Date(b.syncedAt) : null,b.note || null,b.requestIp || null,b.sourceLabel || null,
    ]);
  }
  for (const p of store.pending) {
    await db.query(`INSERT INTO pending_transactions (
      session_id,theatre_id,show_id,authority_when_started,state,notes,created_at,resolved_at
    ) VALUES (?,?,?,?,?,?,?,?)`, [
      p.sessionId,p.theatreId,p.showId,p.authorityWhenStarted,p.state,p.notes || null,
      new Date(p.createdAt),p.resolvedAt ? new Date(p.resolvedAt) : null,
    ]);
  }
}

export async function readStore(): Promise<Store> {
  return useMysql() ? readMysqlStore() : readJsonStore();
}

export async function writeStore(store: Store) {
  return useMysql() ? writeMysqlStore(store) : writeJsonStore(store);
}

export async function upsertTheatre(next: Theatre) {
  const store = await readStore();
  const idx = store.theatres.findIndex(t => t.theatreId === next.theatreId);
  if (idx >= 0) store.theatres[idx] = next; else store.theatres.push(next);
  await writeStore(store);
  return next;
}

export async function addBooking(booking: Booking) {
  const store = await readStore();
  const idx = store.bookings.findIndex(b => b.bookingId === booking.bookingId);
  if (idx >= 0) store.bookings[idx] = booking; else store.bookings.unshift(booking);
  await writeStore(store);
  return booking;
}

export async function addPending(item: PendingTransaction) {
  const store = await readStore();
  const idx = store.pending.findIndex(p => p.sessionId === item.sessionId);
  if (idx >= 0) store.pending[idx] = item; else store.pending.unshift(item);
  await writeStore(store);
  return item;
}
