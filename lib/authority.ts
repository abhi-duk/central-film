export type Authority = 'LOCAL' | 'ONLINE' | 'BLOCKED';

export type Theatre = {
  theatreId: string;
  name: string;
  city: string;
  localPublicUrl: string;
  workingHoursStart: string;
  workingHoursEnd: string;
  outageModeWorkingHours: 'LOCAL_PRIORITY' | 'ONLINE_PRIORITY' | 'BLOCK_ALL';
  outageModeOffHours: 'LOCAL_PRIORITY' | 'ONLINE_PRIORITY' | 'BLOCK_ALL';
  leadTimeCutoffMin: number;
  heartbeatStatus: 'ONLINE' | 'OFFLINE' | 'RECOVERING';
  currentAuthority: Authority;
  recoveryState: 'LIVE' | 'RECOVERING' | 'OFFLINE';
  syncPendingCount: number;
  syncSuccessCount: number;
  syncFailedCount: number;
  syncConflictCount: number;
  lastSyncAt: string | null;
  lastHeartbeatAt: string | null;
  updatedAt: string | null;
  health: { appHealthy: boolean; dbHealthy: boolean; bookingApiHealthy: boolean };
};

export function heartbeatHealthy(theatre: Theatre, thresholdSeconds = Number(process.env.HEARTBEAT_TIMEOUT_SECONDS || 30)) {
  if (!theatre.lastHeartbeatAt) return false;
  const diff = (Date.now() - new Date(theatre.lastHeartbeatAt).getTime()) / 1000;
  return diff >= 0 && diff <= thresholdSeconds;
}

function parseHm(v: string) {
  const [h, m] = v.split(':').map(Number);
  return h * 60 + m;
}

function isWorkingHours(theatre: Theatre, now = new Date()) {
  const mins = now.getHours() * 60 + now.getMinutes();
  const start = parseHm(theatre.workingHoursStart);
  const end = parseHm(theatre.workingHoursEnd);
  return mins >= start && mins <= end;
}

export function determineAuthority(theatre: Theatre, showTimeIso?: string | null): Authority {
  const healthy = heartbeatHealthy(theatre);
  if (healthy) return 'LOCAL';
  const mode = isWorkingHours(theatre) ? theatre.outageModeWorkingHours : theatre.outageModeOffHours;
  if (mode === 'BLOCK_ALL') return 'BLOCKED';
  if (mode === 'LOCAL_PRIORITY') return 'LOCAL';
  if (!showTimeIso) return 'ONLINE';
  const diffMin = (new Date(showTimeIso).getTime() - Date.now()) / 60000;
  return diffMin >= theatre.leadTimeCutoffMin ? 'ONLINE' : 'BLOCKED';
}

export function onlineBookingAllowed(theatre: Theatre, showTimeIso?: string | null) {
  const authority = determineAuthority(theatre, showTimeIso);
  const healthy = heartbeatHealthy(theatre);
  if (healthy && theatre.recoveryState === 'RECOVERING') return false;
  if (healthy && theatre.syncPendingCount > 0) return false;
  if (authority === 'ONLINE') return true;
  if (authority === 'LOCAL' && healthy) return true;
  return false;
}
