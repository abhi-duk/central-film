import type { Authority, TheatreStatus } from './types';

export function heartbeatHealthy(lastHeartbeatAt?: string | null, timeoutSeconds = 120) {
  if (!lastHeartbeatAt) return false;
  const ts = new Date(lastHeartbeatAt).getTime();
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts <= timeoutSeconds * 1000;
}

export function determineAuthority(input: { theatreStatus?: TheatreStatus; lastHeartbeatAt?: string | null; allowCentralFallback?: boolean; timeoutSeconds?: number }): Authority {
  const healthy = heartbeatHealthy(input.lastHeartbeatAt, input.timeoutSeconds ?? 120);
  if (healthy && input.theatreStatus !== 'OFFLINE') return 'LOCAL';
  if (input.allowCentralFallback) return 'ONLINE';
  return 'BLOCKED';
}
