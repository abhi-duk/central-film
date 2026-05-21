export type Authority = 'LOCAL' | 'ONLINE' | 'BLOCKED';
export type TheatreStatus = 'ONLINE' | 'RECOVERING' | 'OFFLINE' | 'DEGRADED';
export type SeatStatus = 'AVAILABLE' | 'HELD' | 'BOOKED';
export type SeatClass = 'PREMIUM' | 'EXECUTIVE' | 'ECONOMY';
export type SyncStatus = 'NOT_SYNCED' | 'SYNCED_TO_CENTRAL' | 'RECONCILED' | 'CONFLICT';

export type Pricing = {
  premiumRate: number;
  executiveRate: number;
  economyRate: number;
  gstPct: number;
  entertainmentTaxPct: number;
  cessPct: number;
};

export type Show = {
  showId: string;
  movieTitle: string;
  theatreId: string;
  theatreName: string;
  screenId: string;
  timeIso: string;
  dayLabel: string;
  dateLabel: string;
  timeLabel: string;
  slot: string;
  pricing: Pricing;
};

export type SeatRecord = {
  seatId: string;
  rowLabel: string;
  seatNo: number;
  seatClass: SeatClass;
  status: SeatStatus;
  holdId?: string | null;
  showId?: string | null;
  holdExpiresAt?: string | null;
};

export type Booking = {
  bookingId: string;
  holdId?: string;
  theatreId: string;
  showId: string;
  movieTitle: string;
  theatreName: string;
  showTimeIso: string;
  seats: string[];
  amount: number;
  bookingStatus: 'HELD' | 'CONFIRMED' | 'CANCELLED';
  bookingSource: 'CENTRAL_ONLINE' | 'LOCAL_COUNTER' | 'LOCAL_KIOSK';
  syncStatus: SyncStatus;
  createdAt: string;
};

export type PendingTransaction = {
  transaction_id: string;
  booking_id: string;
  show_id?: string;
  transaction_state: 'PENDING_CONFIRMATION' | 'FAILED' | 'CONFIRMED';
  amount: number;
};

export type HoldRecord = {
  holdId: string;
  transactionId: string;
  theatreId: string;
  showId: string;
  movieTitle: string;
  theatreName: string;
  showTimeIso: string;
  seats: string[];
  seatClasses: Record<string, SeatClass>;
  amount: number;
  status: 'HELD' | 'CONFIRMED' | 'RELEASED' | 'EXPIRED';
  expiresAt: string;
  createdAt: string;
};

export type BookingPolicy = {
  policyId: string;
  holdMinutes: number;
  paymentGraceSeconds: number;
  heartbeatTimeoutSeconds: number;
  allowCentralFallback: boolean;
  updatedAt: string;
};
