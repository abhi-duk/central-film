import { asArray, getPool } from './db';
import type { Booking, BookingPolicy, HoldRecord, PendingTransaction, Pricing, SeatClass, SeatRecord, Show, TheatreStatus } from './types';

const IST_FORMAT: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' };
const TIME_FORMAT: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' };
const now = new Date();
const evening = new Date(now.getTime() + 1000 * 60 * 60 * 3);
const night = new Date(now.getTime() + 1000 * 60 * 60 * 6);

export const pricing: Pricing = {
  premiumRate: 220,
  executiveRate: 170,
  economyRate: 120,
  gstPct: 18,
  entertainmentTaxPct: 8,
  cessPct: 1,
};

export const shows: Show[] = [
  {
    showId: 'SHOW_EMP_001',
    movieTitle: 'Empuraan',
    theatreId: 'THT_EMP',
    theatreName: 'EVM Palace Cinemas, Ernakulam',
    screenId: 'SCR_EMP_01',
    timeIso: evening.toISOString(),
    dayLabel: 'Today',
    dateLabel: evening.toLocaleDateString('en-IN', IST_FORMAT),
    timeLabel: evening.toLocaleTimeString('en-IN', TIME_FORMAT),
    slot: 'Evening Show',
    pricing,
  },
  {
    showId: 'SHOW_VAZHA_001',
    movieTitle: 'Vaazha',
    theatreId: 'THT_EMP',
    theatreName: 'EVM Palace Cinemas, Ernakulam',
    screenId: 'SCR_EMP_01',
    timeIso: night.toISOString(),
    dayLabel: 'Today',
    dateLabel: night.toLocaleDateString('en-IN', IST_FORMAT),
    timeLabel: night.toLocaleTimeString('en-IN', TIME_FORMAT),
    slot: 'Night Show',
    pricing,
  },
];

let policy: BookingPolicy = {
  policyId: 'DEFAULT',
  holdMinutes: 8,
  paymentGraceSeconds: 90,
  heartbeatTimeoutSeconds: 120,
  allowCentralFallback: false,
  updatedAt: new Date().toISOString(),
};

function seatClassForRow(row: string): SeatClass {
  if (['A', 'B', 'C'].includes(row)) return 'PREMIUM';
  if (['D', 'E', 'F'].includes(row)) return 'EXECUTIVE';
  return 'ECONOMY';
}

export function generateSeats(): SeatRecord[] {
  const rows = 'ABCDEFGHI'.split('');
  const seats: SeatRecord[] = [];
  for (const rowLabel of rows) {
    for (let seatNo = 1; seatNo <= 16; seatNo++) {
      const seatId = `${rowLabel}${seatNo}`;
      let status: SeatRecord['status'] = 'AVAILABLE';
      if (['A1', 'A2', 'C7', 'E5', 'G10', 'H11'].includes(seatId)) status = 'BOOKED';
      seats.push({
        seatId,
        rowLabel,
        seatNo,
        seatClass: seatClassForRow(rowLabel),
        status,
        holdId: null,
        showId: null,
        holdExpiresAt: null,
      });
    }
  }
  return seats;
}

let seatState = generateSeats();
let holds: HoldRecord[] = [];
let bookings: Booking[] = [
  {
    bookingId: 'BKG-CEN-0001',
    theatreId: 'THT_EMP',
    showId: 'SHOW_EMP_001',
    movieTitle: 'Empuraan',
    theatreName: 'EVM Palace Cinemas, Ernakulam',
    showTimeIso: shows[0].timeIso,
    seats: ['A1', 'A2'],
    amount: 571.12,
    bookingStatus: 'CONFIRMED',
    bookingSource: 'CENTRAL_ONLINE',
    syncStatus: 'RECONCILED',
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
];
let pending: PendingTransaction[] = [
  { transaction_id: 'TXN-0001', booking_id: 'BKG-CEN-0001', show_id: 'SHOW_EMP_001', transaction_state: 'CONFIRMED', amount: 571.12 },
];
let theatreStatus: TheatreStatus = 'RECOVERING';
let heartbeatAt = new Date(Date.now() - 1000 * 20).toISOString();
let syncCounts = { pending: 7, synced: 124, failed: 1, conflicts: 0, lastSyncAt: new Date(Date.now() - 1000 * 60 * 5).toISOString() };

function sqlDate(value: string | Date | null | undefined) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function encodeHoldPayload(hold: HoldRecord) {
  const selectedSeatClasses = Object.fromEntries(
    hold.seats.map((seatId) => [seatId, hold.seatClasses?.[seatId]]).filter(([, cls]) => Boolean(cls)),
  );
  const compactHold = {
    holdId: hold.holdId,
    transactionId: hold.transactionId,
    theatreId: hold.theatreId,
    showId: hold.showId,
    movieTitle: hold.movieTitle,
    theatreName: hold.theatreName,
    showTimeIso: hold.showTimeIso,
    seats: hold.seats,
    seatClasses: selectedSeatClasses,
    amount: hold.amount,
    status: hold.status,
    expiresAt: hold.expiresAt,
    createdAt: hold.createdAt,
  };
  return Buffer.from(JSON.stringify(compactHold), 'utf8').toString('base64url');
}

export function decodeHoldPayload(token?: string | null): HoldRecord | null {
  if (!token) return null;
  try {
    const raw = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
    if (!raw || typeof raw !== 'object') return null;
    const seats = parseJsonArray((raw as any).seats);
    const holdId = String((raw as any).holdId || (raw as any).hold_id || '');
    const showId = String((raw as any).showId || (raw as any).show_id || '');
    if (!holdId || !showId || !seats.length) return null;
    const show = shows.find((entry) => entry.showId === showId) || shows[0];
    return {
      holdId,
      transactionId: String((raw as any).transactionId || (raw as any).transaction_id || `TXN-${Date.now()}`),
      theatreId: String((raw as any).theatreId || (raw as any).theatre_id || show.theatreId),
      showId,
      movieTitle: String((raw as any).movieTitle || (raw as any).movie_title || show.movieTitle),
      theatreName: String((raw as any).theatreName || (raw as any).theatre_name || show.theatreName),
      showTimeIso: String((raw as any).showTimeIso || (raw as any).show_time_iso || show.timeIso),
      seats,
      seatClasses: typeof (raw as any).seatClasses === 'object' && (raw as any).seatClasses ? (raw as any).seatClasses : {},
      amount: Number((raw as any).amount || 0),
      status: ((raw as any).status || 'HELD') as HoldRecord['status'],
      expiresAt: String((raw as any).expiresAt || (raw as any).expires_at || new Date(Date.now() + policy.holdMinutes * 60 * 1000).toISOString()),
      createdAt: String((raw as any).createdAt || (raw as any).created_at || new Date().toISOString()),
    };
  } catch {
    return null;
  }
}

function holdFromSnapshot(value: unknown): HoldRecord | null {
  if (!value || typeof value !== 'object') return null;
  try {
    return decodeHoldPayload(encodeHoldPayload(value as HoldRecord));
  } catch {
    return null;
  }
}

function asBool(value: unknown) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function mapBookingRow(row: any): Booking {
  return {
    bookingId: row.booking_id ?? row.bookingId,
    holdId: row.hold_id ?? row.holdId ?? undefined,
    theatreId: row.theatre_id ?? row.theatreId ?? 'THT_EMP',
    showId: row.show_id ?? row.showId ?? 'SHOW_EMP_001',
    movieTitle: row.movie_title ?? row.movieTitle ?? 'Untitled',
    theatreName: row.theatre_name ?? row.theatreName ?? 'Unknown theatre',
    showTimeIso: row.show_time_iso?.toISOString?.() ?? row.show_time_iso ?? row.showTimeIso ?? new Date().toISOString(),
    seats: row.seats ?? parseJsonArray(row.seats_json),
    amount: Number(row.amount ?? 0),
    bookingStatus: row.booking_status ?? row.bookingStatus ?? 'CONFIRMED',
    bookingSource: row.booking_source ?? row.bookingSource ?? 'CENTRAL_ONLINE',
    syncStatus: row.sync_status ?? row.syncStatus ?? 'NOT_SYNCED',
    createdAt: row.created_at?.toISOString?.() ?? row.created_at ?? row.createdAt ?? new Date().toISOString(),
  };
}

function mapPendingRow(row: any): PendingTransaction {
  return {
    transaction_id: row.transaction_id ?? row.transactionId,
    booking_id: row.booking_id ?? row.bookingId,
    show_id: row.show_id ?? row.showId ?? undefined,
    transaction_state: row.transaction_state ?? row.transactionState ?? 'PENDING_CONFIRMATION',
    amount: Number(row.amount ?? 0),
  };
}

function mapPolicyRow(row: any): BookingPolicy {
  return {
    policyId: row.policy_id ?? row.policyId ?? 'DEFAULT',
    holdMinutes: Number(row.hold_minutes ?? row.holdMinutes ?? 8),
    paymentGraceSeconds: Number(row.payment_grace_seconds ?? row.paymentGraceSeconds ?? 90),
    heartbeatTimeoutSeconds: Number(row.heartbeat_timeout_seconds ?? row.heartbeatTimeoutSeconds ?? 120),
    allowCentralFallback: asBool(row.allow_central_fallback ?? row.allowCentralFallback),
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at ?? row.updatedAt ?? new Date().toISOString(),
  };
}

function normalizeBooking(raw: any): Booking {
  const show = shows.find((item) => item.showId === (raw.showId ?? raw.show_id)) ?? shows[0];
  return {
    bookingId: String(raw.bookingId ?? raw.booking_id ?? `BKG-CEN-${Date.now()}`),
    holdId: raw.holdId ?? raw.hold_id ?? undefined,
    theatreId: String(raw.theatreId ?? raw.theatre_id ?? show.theatreId),
    showId: String(raw.showId ?? raw.show_id ?? show.showId),
    movieTitle: String(raw.movieTitle ?? raw.movie_title ?? show.movieTitle),
    theatreName: String(raw.theatreName ?? raw.theatre_name ?? show.theatreName),
    showTimeIso: String(raw.showTimeIso ?? raw.show_time_iso ?? show.timeIso),
    seats: parseJsonArray(raw.seats ?? raw.seats_json),
    amount: Number(raw.amount ?? 0),
    bookingStatus: raw.bookingStatus ?? raw.booking_status ?? 'CONFIRMED',
    bookingSource: raw.bookingSource ?? raw.booking_source ?? 'CENTRAL_ONLINE',
    syncStatus: raw.syncStatus ?? raw.sync_status ?? 'SYNCED_TO_CENTRAL',
    createdAt: raw.createdAt ?? raw.created_at ?? new Date().toISOString(),
  };
}

function expireOldHolds() {
  const nowMs = Date.now();
  const expiredIds = new Set(
    holds.filter((hold) => hold.status === 'HELD' && new Date(hold.expiresAt).getTime() <= nowMs).map((hold) => hold.holdId),
  );
  if (!expiredIds.size) return;
  holds = holds.map((hold) => expiredIds.has(hold.holdId) ? { ...hold, status: 'EXPIRED' } : hold);
  pending = pending.map((txn) => expiredIds.has(txn.booking_id) ? { ...txn, transaction_state: 'FAILED' } : txn);
  seatState = seatState.map((seat) => expiredIds.has(String(seat.holdId)) ? { ...seat, status: 'AVAILABLE', holdId: null, showId: null, holdExpiresAt: null } : seat);
}

function amountForSeats(seatIds: string[], seatClasses: Record<string, SeatClass>, price: Pricing) {
  const net = seatIds.reduce((sum, seatId) => {
    const cls = seatClasses[seatId] ?? seatState.find((seat) => seat.seatId === seatId)?.seatClass ?? 'ECONOMY';
    const rate = cls === 'PREMIUM' ? price.premiumRate : cls === 'EXECUTIVE' ? price.executiveRate : price.economyRate;
    return sum + rate;
  }, 0);
  return +(net + net * price.gstPct / 100 + net * price.entertainmentTaxPct / 100 + net * price.cessPct / 100).toFixed(2);
}

export async function ensureCentralSchema() {
  const pool = await getPool();
  if (!pool) return { success: true, mode: 'memory' as const };

  await pool.query(`CREATE TABLE IF NOT EXISTS theatres (
    theatre_id VARCHAR(40) PRIMARY KEY,
    theatre_name VARCHAR(160) NOT NULL,
    district VARCHAR(80) NOT NULL DEFAULT 'Ernakulam',
    status ENUM('ONLINE','RECOVERING','OFFLINE','DEGRADED') NOT NULL DEFAULT 'OFFLINE',
    last_heartbeat_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS bookings (
    booking_id VARCHAR(80) PRIMARY KEY,
    hold_id VARCHAR(80) NULL,
    theatre_id VARCHAR(40) NOT NULL,
    show_id VARCHAR(40) NOT NULL,
    movie_title VARCHAR(180) NOT NULL,
    theatre_name VARCHAR(160) NOT NULL,
    show_time_iso DATETIME NULL,
    seats_json JSON NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    booking_status ENUM('HELD','CONFIRMED','CANCELLED') NOT NULL,
    booking_source ENUM('CENTRAL_ONLINE','LOCAL_COUNTER','LOCAL_KIOSK') NOT NULL,
    sync_status ENUM('NOT_SYNCED','SYNCED_TO_CENTRAL','RECONCILED','CONFLICT') NOT NULL DEFAULT 'NOT_SYNCED',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_booking_id (booking_id)
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS booking_seats (
    booking_id VARCHAR(80) NOT NULL,
    show_id VARCHAR(40) NOT NULL,
    seat_id VARCHAR(20) NOT NULL,
    PRIMARY KEY (show_id, seat_id)
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS payment_transactions (
    transaction_id VARCHAR(80) PRIMARY KEY,
    booking_id VARCHAR(80) NOT NULL,
    show_id VARCHAR(40) NULL,
    transaction_state ENUM('PENDING_CONFIRMATION','FAILED','CONFIRMED') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS booking_holds (
    hold_id VARCHAR(80) PRIMARY KEY,
    transaction_id VARCHAR(80) NOT NULL,
    theatre_id VARCHAR(40) NOT NULL,
    show_id VARCHAR(40) NOT NULL,
    movie_title VARCHAR(180) NOT NULL,
    theatre_name VARCHAR(160) NOT NULL,
    show_time_iso DATETIME NULL,
    seats_json JSON NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status ENUM('HELD','CONFIRMED','RELEASED','EXPIRED') NOT NULL DEFAULT 'HELD',
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS booking_policies (
    policy_id VARCHAR(40) PRIMARY KEY,
    hold_minutes INT NOT NULL DEFAULT 8,
    payment_grace_seconds INT NOT NULL DEFAULT 90,
    heartbeat_timeout_seconds INT NOT NULL DEFAULT 120,
    allow_central_fallback TINYINT(1) NOT NULL DEFAULT 0,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`);
  await pool.query(`INSERT IGNORE INTO booking_policies (policy_id, hold_minutes, payment_grace_seconds, heartbeat_timeout_seconds, allow_central_fallback) VALUES ('DEFAULT', 8, 90, 120, 0)`);
  await pool.query(`INSERT IGNORE INTO theatres (theatre_id, theatre_name, district, status, last_heartbeat_at) VALUES ('THT_EMP', 'EVM Palace Cinemas, Ernakulam', 'Ernakulam', 'RECOVERING', NOW())`);
  return { success: true, mode: 'mysql' as const };
}

export async function getShows(): Promise<Show[]> {
  return shows;
}

export async function getPolicy(): Promise<BookingPolicy> {
  const pool = await getPool();
  if (!pool) return policy;
  try {
    await ensureCentralSchema();
    const [rows] = await pool.query('SELECT * FROM booking_policies WHERE policy_id = ? LIMIT 1', ['DEFAULT']);
    const first = asArray<any>(rows)[0];
    return first ? mapPolicyRow(first) : policy;
  } catch {
    return policy;
  }
}

export async function updatePolicy(input: Partial<BookingPolicy>) {
  policy = {
    ...policy,
    holdMinutes: Number(input.holdMinutes ?? policy.holdMinutes),
    paymentGraceSeconds: Number(input.paymentGraceSeconds ?? policy.paymentGraceSeconds),
    heartbeatTimeoutSeconds: Number(input.heartbeatTimeoutSeconds ?? policy.heartbeatTimeoutSeconds),
    allowCentralFallback: Boolean(input.allowCentralFallback ?? policy.allowCentralFallback),
    updatedAt: new Date().toISOString(),
  };
  const pool = await getPool();
  if (pool) {
    await ensureCentralSchema();
    await pool.query(
      `INSERT INTO booking_policies (policy_id, hold_minutes, payment_grace_seconds, heartbeat_timeout_seconds, allow_central_fallback)
       VALUES ('DEFAULT', ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE hold_minutes = VALUES(hold_minutes), payment_grace_seconds = VALUES(payment_grace_seconds), heartbeat_timeout_seconds = VALUES(heartbeat_timeout_seconds), allow_central_fallback = VALUES(allow_central_fallback)`,
      [policy.holdMinutes, policy.paymentGraceSeconds, policy.heartbeatTimeoutSeconds, policy.allowCentralFallback ? 1 : 0],
    );
  }
  return policy;
}

export async function getLiveShow(showId: string) {
  expireOldHolds();
  const currentPolicy = await getPolicy();
  const show = shows.find((entry) => entry.showId === showId) || shows[0];
  const healthy = Date.now() - new Date(heartbeatAt).getTime() < currentPolicy.heartbeatTimeoutSeconds * 1000;
  const canBookOnline = healthy && theatreStatus !== 'OFFLINE';
  const authority = canBookOnline ? 'LOCAL' : currentPolicy.allowCentralFallback ? 'ONLINE' : 'BLOCKED';
  const seatMap = Object.fromEntries(seatState.map((seat) => [seat.seatId, { status: seat.status, holdExpiresAt: seat.holdExpiresAt || null }]));
  const seatClasses = Object.fromEntries(seatState.map((seat) => [seat.seatId, seat.seatClass]));
  return {
    success: true,
    show: { ...show, time: show.timeIso },
    versionNo: Date.now(),
    changed: true,
    seatMap,
    seatClasses,
    pricing: show.pricing,
    authority,
    heartbeatHealthy: healthy,
    canBookOnline: authority !== 'BLOCKED',
    theatreStatus,
    syncCounts,
    message: authority !== 'BLOCKED'
      ? 'Theatre connection is healthy. Seats are checked live before payment.'
      : 'Booking is paused until theatre health checks pass.',
  };
}

export async function holdSeats(input: { theatreId: string; showId: string; movieTitle?: string; theatreName?: string; showTimeIso?: string; seatIds: string[]; pricing?: Pricing | null; seatClasses?: Record<string, SeatClass>; }) {
  expireOldHolds();
  const show = shows.find((entry) => entry.showId === input.showId) || shows[0];
  const seatIds = Array.isArray(input.seatIds) ? input.seatIds.map(String) : [];
  if (!input.theatreId || !input.showId) return { success: false, message: 'theatreId and showId are required' };
  if (!seatIds.length) return { success: false, message: 'Select at least one seat' };

  const unavailable = seatIds.filter((seatId) => {
    const found = seatState.find((seat) => seat.seatId === seatId);
    return !found || found.status !== 'AVAILABLE';
  });
  if (unavailable.length) return { success: false, message: `Seats already unavailable: ${unavailable.join(', ')}` };

  const holdId = `HOLD-${Date.now()}`;
  const transactionId = `TXN-${Date.now()}`;
  const currentPolicy = await getPolicy();
  const expires = new Date(Date.now() + currentPolicy.holdMinutes * 60 * 1000).toISOString();
  const seatClasses = input.seatClasses || Object.fromEntries(seatState.map((seat) => [seat.seatId, seat.seatClass]));
  const amount = amountForSeats(seatIds, seatClasses, input.pricing || show.pricing || pricing);
  const hold: HoldRecord = {
    holdId,
    transactionId,
    theatreId: input.theatreId,
    showId: input.showId,
    movieTitle: input.movieTitle || show.movieTitle,
    theatreName: input.theatreName || show.theatreName,
    showTimeIso: input.showTimeIso || show.timeIso,
    seats: seatIds,
    seatClasses,
    amount,
    status: 'HELD',
    expiresAt: expires,
    createdAt: new Date().toISOString(),
  };

  holds.push(hold);
  pending.push({ transaction_id: transactionId, booking_id: holdId, show_id: input.showId, transaction_state: 'PENDING_CONFIRMATION', amount });
  seatState = seatState.map((seat) => seatIds.includes(seat.seatId) ? { ...seat, status: 'HELD', holdId, showId: input.showId, holdExpiresAt: expires } : seat);

  const pool = await getPool();
  if (pool) {
    try {
      await ensureCentralSchema();
      await pool.query(
        `INSERT INTO booking_holds (hold_id, transaction_id, theatre_id, show_id, movie_title, theatre_name, show_time_iso, seats_json, amount, status, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?, 'HELD', ?)`,
        [hold.holdId, hold.transactionId, hold.theatreId, hold.showId, hold.movieTitle, hold.theatreName, sqlDate(hold.showTimeIso), JSON.stringify(hold.seats), hold.amount, sqlDate(hold.expiresAt)],
      );
      await pool.query(
        `INSERT INTO payment_transactions (transaction_id, booking_id, show_id, transaction_state, amount) VALUES (?, ?, ?, 'PENDING_CONFIRMATION', ?)`,
        [transactionId, holdId, input.showId, amount],
      );
    } catch {
      // Keep demo mode usable even if the optional DB has an older schema.
    }
  }

  return { success: true, holdId, showId: input.showId, transactionId, amount, expiresAt: expires, holdToken: encodeHoldPayload(hold) };
}

export async function getHoldDetails(holdId: string, showId?: string) {
  expireOldHolds();
  if (!holdId) return null;
  const memoryHold = holds.find((hold) => hold.holdId === holdId && (!showId || hold.showId === showId));
  if (memoryHold) return memoryHold;

  const pool = await getPool();
  if (!pool) return null;
  try {
    await ensureCentralSchema();
    const [rows] = await pool.query(
      `SELECT * FROM booking_holds WHERE hold_id = ? ${showId ? 'AND show_id = ?' : ''} LIMIT 1`,
      showId ? [holdId, showId] : [holdId],
    );
    const row = asArray<any>(rows)[0];
    if (!row) return null;
    return {
      holdId: row.hold_id,
      transactionId: row.transaction_id,
      theatreId: row.theatre_id,
      showId: row.show_id,
      movieTitle: row.movie_title,
      theatreName: row.theatre_name,
      showTimeIso: row.show_time_iso?.toISOString?.() ?? row.show_time_iso ?? new Date().toISOString(),
      seats: parseJsonArray(row.seats_json),
      seatClasses: {},
      amount: Number(row.amount ?? 0),
      status: row.status ?? 'HELD',
      expiresAt: row.expires_at?.toISOString?.() ?? row.expires_at ?? new Date().toISOString(),
      createdAt: row.created_at?.toISOString?.() ?? row.created_at ?? new Date().toISOString(),
    } satisfies HoldRecord;
  } catch {
    return null;
  }
}

export async function confirmHold(input: string | { holdId?: string; showId?: string; holdToken?: string; hold?: HoldRecord | null }) {
  const holdId = typeof input === 'string' ? input : input.holdId || '';
  const requestedShowId = typeof input === 'string' ? undefined : input.showId;
  const fallbackHold = typeof input === 'string' ? null : (decodeHoldPayload(input.holdToken) || holdFromSnapshot(input.hold));
  const hold = (await getHoldDetails(holdId, requestedShowId)) || (fallbackHold && fallbackHold.holdId === holdId ? fallbackHold : null);
  if (!hold) return { success: false, message: 'Valid holdId is required' };
  const showId = requestedShowId || hold.showId;
  if (!showId) return { success: false, message: 'holdId and showId are required' };
  if (hold.status !== 'HELD') {
    const existing = bookings.find((booking) => booking.holdId === holdId);
    return existing ? { success: true, booking: existing, alreadyConfirmed: true } : { success: false, message: `Hold is ${hold.status.toLowerCase()}` };
  }
  if (new Date(hold.expiresAt).getTime() <= Date.now()) {
    await releaseHold({ holdId, showId, reason: 'EXPIRED' });
    return { success: false, message: 'Seat hold expired. Please select seats again.' };
  }

  const selectedSeats = seatState.filter((seat) => seat.holdId === holdId && seat.showId === showId);
  const booking: Booking = {
    bookingId: `BKG-CEN-${Date.now()}`,
    holdId,
    theatreId: hold.theatreId,
    showId,
    movieTitle: hold.movieTitle,
    theatreName: hold.theatreName,
    showTimeIso: hold.showTimeIso,
    seats: selectedSeats.length ? selectedSeats.map((seat) => seat.seatId) : hold.seats,
    amount: hold.amount,
    bookingStatus: 'CONFIRMED',
    bookingSource: 'CENTRAL_ONLINE',
    syncStatus: 'NOT_SYNCED',
    createdAt: new Date().toISOString(),
  };

  bookings.push(booking);
  holds = holds.map((entry) => entry.holdId === holdId ? { ...entry, status: 'CONFIRMED' } : entry);
  pending = pending.map((txn) => txn.booking_id === holdId ? { ...txn, transaction_state: 'CONFIRMED' } : txn);
  seatState = seatState.map((seat) => seat.holdId === holdId && seat.showId === showId ? { ...seat, status: 'BOOKED', holdId: null, showId: null, holdExpiresAt: null } : seat);

  const pool = await getPool();
  if (pool) {
    try {
      await ensureCentralSchema();
      await pool.query(
        `INSERT INTO bookings (booking_id, hold_id, theatre_id, show_id, movie_title, theatre_name, show_time_iso, seats_json, amount, booking_status, booking_source, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?, 'CONFIRMED', 'CENTRAL_ONLINE', 'NOT_SYNCED')
         ON DUPLICATE KEY UPDATE booking_status = 'CONFIRMED', sync_status = VALUES(sync_status)`,
        [booking.bookingId, holdId, booking.theatreId, booking.showId, booking.movieTitle, booking.theatreName, sqlDate(booking.showTimeIso), JSON.stringify(booking.seats), booking.amount],
      );
      for (const seatId of booking.seats) {
        await pool.query(
          `INSERT IGNORE INTO booking_seats (booking_id, show_id, seat_id) VALUES (?, ?, ?)`,
          [booking.bookingId, booking.showId, seatId],
        );
      }
      await pool.query(`UPDATE payment_transactions SET transaction_state = 'CONFIRMED' WHERE booking_id = ?`, [holdId]);
      await pool.query(`UPDATE booking_holds SET status = 'CONFIRMED' WHERE hold_id = ?`, [holdId]);
    } catch {
      // Optional DB failure should not break the demo confirmation path.
    }
  }

  return { success: true, booking };
}

export async function releaseHold(input: { holdId?: string; showId?: string; reason?: 'RELEASED' | 'EXPIRED' | 'FAILED' }) {
  const holdId = input.holdId || '';
  if (!holdId) return { success: false, message: 'holdId is required' };
  const hold = await getHoldDetails(holdId, input.showId);
  if (!hold) return { success: false, message: 'Hold not found' };
  const status = input.reason === 'EXPIRED' ? 'EXPIRED' : 'RELEASED';
  holds = holds.map((entry) => entry.holdId === holdId ? { ...entry, status } : entry);
  pending = pending.map((txn) => txn.booking_id === holdId ? { ...txn, transaction_state: 'FAILED' } : txn);
  seatState = seatState.map((seat) => seat.holdId === holdId && (!input.showId || seat.showId === input.showId) ? { ...seat, status: 'AVAILABLE', holdId: null, showId: null, holdExpiresAt: null } : seat);

  const pool = await getPool();
  if (pool) {
    try {
      await ensureCentralSchema();
      await pool.query(`UPDATE booking_holds SET status = ? WHERE hold_id = ?`, [status, holdId]);
      await pool.query(`UPDATE payment_transactions SET transaction_state = 'FAILED' WHERE booking_id = ?`, [holdId]);
    } catch {}
  }

  return { success: true, holdId, showId: hold.showId, status };
}

export async function resolvePendingTransaction(input: string | { bookingId?: string; holdId?: string; transactionState?: PendingTransaction['transaction_state'] }) {
  const bookingOrHoldId = typeof input === 'string' ? input : (input.holdId || input.bookingId || '');
  const nextState = typeof input === 'string' ? 'CONFIRMED' : (input.transactionState || 'CONFIRMED');
  if (!bookingOrHoldId) return { success: false, message: 'bookingId or holdId is required' };
  pending = pending.map((txn) => txn.booking_id === bookingOrHoldId ? { ...txn, transaction_state: nextState } : txn);
  const pool = await getPool();
  if (pool) {
    try {
      await ensureCentralSchema();
      await pool.query('UPDATE payment_transactions SET transaction_state = ? WHERE booking_id = ?', [nextState, bookingOrHoldId]);
    } catch {}
  }
  return { success: true, bookingId: bookingOrHoldId, transactionState: nextState };
}

export async function saveCentralBooking(rawBooking: any) {
  const booking = normalizeBooking(rawBooking);
  const exists = bookings.some((entry) => entry.bookingId === booking.bookingId);
  if (!exists) bookings.push(booking);
  seatState = seatState.map((seat) => booking.seats.includes(seat.seatId) ? { ...seat, status: 'BOOKED', holdId: null, showId: null, holdExpiresAt: null } : seat);

  const pool = await getPool();
  if (pool) {
    try {
      await ensureCentralSchema();
      await pool.query(
        `INSERT INTO bookings (booking_id, hold_id, theatre_id, show_id, movie_title, theatre_name, show_time_iso, seats_json, amount, booking_status, booking_source, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE sync_status = VALUES(sync_status), booking_status = VALUES(booking_status)`,
        [booking.bookingId, booking.holdId || null, booking.theatreId, booking.showId, booking.movieTitle, booking.theatreName, sqlDate(booking.showTimeIso), JSON.stringify(booking.seats), booking.amount, booking.bookingStatus, booking.bookingSource, booking.syncStatus],
      );
      for (const seatId of booking.seats) {
        await pool.query('INSERT IGNORE INTO booking_seats (booking_id, show_id, seat_id) VALUES (?, ?, ?)', [booking.bookingId, booking.showId, seatId]);
      }
    } catch {}
  }
  return { success: true, booking, inserted: !exists };
}

export async function receiveHeartbeat(body: { theatreId?: string; status?: TheatreStatus; pendingSync?: number; failedSync?: number; conflicts?: number; }) {
  heartbeatAt = new Date().toISOString();
  theatreStatus = body.status || (body.pendingSync ? 'RECOVERING' : 'ONLINE');
  syncCounts = {
    ...syncCounts,
    pending: Number(body.pendingSync ?? syncCounts.pending),
    failed: Number(body.failedSync ?? syncCounts.failed),
    conflicts: Number(body.conflicts ?? syncCounts.conflicts),
  };
  const pool = await getPool();
  if (pool) {
    try {
      await ensureCentralSchema();
      await pool.query(
        `INSERT INTO theatres (theatre_id, theatre_name, district, status, last_heartbeat_at)
         VALUES (?, ?, 'Ernakulam', ?, NOW())
         ON DUPLICATE KEY UPDATE status = VALUES(status), last_heartbeat_at = NOW()`,
        [body.theatreId || 'THT_EMP', 'EVM Palace Cinemas, Ernakulam', theatreStatus],
      );
    } catch {}
  }
  return { success: true, theatreStatus, heartbeatAt, syncCounts };
}

export async function markTimedOutTheatres(timeoutSeconds?: number) {
  const currentPolicy = await getPolicy();
  const limit = timeoutSeconds ?? currentPolicy.heartbeatTimeoutSeconds;
  const timedOut = Date.now() - new Date(heartbeatAt).getTime() > limit * 1000;
  if (timedOut) theatreStatus = 'OFFLINE';
  const pool = await getPool();
  if (pool) {
    try {
      await ensureCentralSchema();
      await pool.query(`UPDATE theatres SET status = 'OFFLINE' WHERE last_heartbeat_at IS NULL OR last_heartbeat_at < DATE_SUB(NOW(), INTERVAL ? SECOND)`, [limit]);
    } catch {}
  }
  return { success: true, timedOut, theatreStatus, heartbeatAt };
}

export async function receiveSync(payload: { bookings?: Booking[] }) {
  const incoming = Array.isArray(payload.bookings) ? payload.bookings : [];
  const acknowledged: string[] = [];
  const inserted: string[] = [];
  for (const raw of incoming) {
    const result = await saveCentralBooking(raw);
    if (result.inserted) inserted.push(result.booking.bookingId);
    else acknowledged.push(result.booking.bookingId);
  }
  syncCounts = { ...syncCounts, pending: Math.max(0, syncCounts.pending - inserted.length), synced: syncCounts.synced + inserted.length, lastSyncAt: new Date().toISOString() };
  return { success: true, inserted, acknowledged, syncCounts };
}

export async function readMysqlStore() {
  return getReportStore();
}

export async function getReportStore() {
  expireOldHolds();
  const currentPolicy = await getPolicy();
  const pool = await getPool();
  if (!pool) return { shows, seats: seatState, holds, bookings, pending, syncCounts, theatreStatus, heartbeatAt, policy: currentPolicy };
  try {
    await ensureCentralSchema();
    const [bookingRows] = await pool.query('SELECT * FROM bookings ORDER BY created_at DESC LIMIT 200');
    const [pendingRows] = await pool.query('SELECT * FROM payment_transactions ORDER BY created_at DESC LIMIT 200');
    const [holdRows] = await pool.query('SELECT * FROM booking_holds ORDER BY created_at DESC LIMIT 200');
    return {
      shows,
      seats: seatState,
      holds: asArray<any>(holdRows).map((row) => ({
        holdId: row.hold_id,
        transactionId: row.transaction_id,
        theatreId: row.theatre_id,
        showId: row.show_id,
        movieTitle: row.movie_title,
        theatreName: row.theatre_name,
        showTimeIso: row.show_time_iso?.toISOString?.() ?? row.show_time_iso ?? new Date().toISOString(),
        seats: parseJsonArray(row.seats_json),
        seatClasses: {},
        amount: Number(row.amount ?? 0),
        status: row.status ?? 'HELD',
        expiresAt: row.expires_at?.toISOString?.() ?? row.expires_at ?? new Date().toISOString(),
        createdAt: row.created_at?.toISOString?.() ?? row.created_at ?? new Date().toISOString(),
      })),
      bookings: asArray<any>(bookingRows).map(mapBookingRow),
      pending: asArray<any>(pendingRows).map(mapPendingRow),
      syncCounts,
      theatreStatus,
      heartbeatAt,
      policy: currentPolicy,
    };
  } catch {
    return { shows, seats: seatState, holds, bookings, pending, syncCounts, theatreStatus, heartbeatAt, policy: currentPolicy };
  }
}
