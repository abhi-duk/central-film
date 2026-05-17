import fs from 'fs';
import path from 'path';

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

function ensure() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(seedPath)) {
    fs.writeFileSync(seedPath, JSON.stringify({"theatres": [{"theatreId": "KSFDC_SREE_TVM", "name": "KSFDC Sree, TVM", "city": "Thiruvananthapuram", "localPublicUrl": "http://localhost:3000", "workingHoursStart": "09:00", "workingHoursEnd": "23:00", "outageModeWorkingHours": "LOCAL_PRIORITY", "outageModeOffHours": "ONLINE_PRIORITY", "leadTimeCutoffMin": 120, "heartbeatStatus": "OFFLINE", "currentAuthority": "BLOCKED", "lastHeartbeatAt": null, "updatedAt": null, "health": {"appHealthy": false, "dbHealthy": false, "bookingApiHealthy": false}}], "bookings": [], "pending": []}, null, 2));
  }
  if (!fs.existsSync(dataPath)) {
    fs.copyFileSync(seedPath, dataPath);
  }
}

export function readStore(): Store {
  ensure();
  return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
}

export function writeStore(store: Store) {
  ensure();
  fs.writeFileSync(dataPath, JSON.stringify(store, null, 2));
}

export function upsertTheatre(next: Theatre) {
  const store = readStore();
  const idx = store.theatres.findIndex(t => t.theatreId === next.theatreId);
  if (idx >= 0) store.theatres[idx] = next; else store.theatres.push(next);
  writeStore(store);
  return next;
}

export function addBooking(booking: Booking) {
  const store = readStore();
  const idx = store.bookings.findIndex(b => b.bookingId === booking.bookingId);
  if (idx >= 0) store.bookings[idx] = booking; else store.bookings.unshift(booking);
  writeStore(store);
  return booking;
}

export function addPending(item: PendingTransaction) {
  const store = readStore();
  store.pending.unshift(item);
  writeStore(store);
  return item;
}
