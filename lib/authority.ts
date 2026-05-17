import type { Authority, OutageMode, Theatre } from './store';

const HEARTBEAT_TIMEOUT_SECONDS = Number(process.env.HEARTBEAT_TIMEOUT_SECONDS || 20);

function inWindow(now: Date, start: string, end: string) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const mins = now.getHours() * 60 + now.getMinutes();
  const s = sh * 60 + sm;
  const e = eh * 60 + em;
  return mins >= s && mins <= e;
}

export function heartbeatHealthy(theatre: Theatre, thresholdSeconds = HEARTBEAT_TIMEOUT_SECONDS) {
  if (!theatre.lastHeartbeatAt) return false;
  const diff = (Date.now() - new Date(theatre.lastHeartbeatAt).getTime()) / 1000;
  return diff <= thresholdSeconds;
}

export function determineAuthority(theatre: Theatre, showTimeIso?: string): Authority {
  const healthy = heartbeatHealthy(theatre);
  if (healthy) return 'LOCAL';

  const now = new Date();
  const duringWorkingHours = inWindow(now, theatre.workingHoursStart, theatre.workingHoursEnd);
  const mode: OutageMode = duringWorkingHours ? theatre.outageModeWorkingHours : theatre.outageModeOffHours;

  if (mode === 'BLOCK_ALL') return 'BLOCKED';
  if (mode === 'LOCAL_PRIORITY') return 'LOCAL';
  if (mode === 'ONLINE_PRIORITY') {
    if (!showTimeIso) return 'ONLINE';
    const diffMin = (new Date(showTimeIso).getTime() - Date.now()) / 60000;
    return diffMin >= theatre.leadTimeCutoffMin ? 'ONLINE' : 'BLOCKED';
  }
  return 'BLOCKED';
}

export function onlineBookingAllowed(theatre: Theatre, showTimeIso?: string) {
  const authority = determineAuthority(theatre, showTimeIso);
  const healthy = heartbeatHealthy(theatre);
  if (authority === 'BLOCKED') return false;
  if (healthy && authority === 'LOCAL') return true;
  if (!healthy && authority === 'ONLINE') return true;
  return false;
}
