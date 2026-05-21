import { getDb, rows } from './db';
import { ensureCentralSchemaAndSeed } from './bootstrap';

export type Authority = 'LOCAL' | 'ONLINE' | 'BLOCKED';

export async function getPolicy() {
  await ensureCentralSchemaAndSeed();
  const db = getDb();
  const [policyRows] = await db.query(`SELECT * FROM booking_policies WHERE policy_id=1 LIMIT 1`);
  const p: any = rows<any>(policyRows)[0] || {};
  return {
    holdSeconds: Number(p.hold_seconds || 90),
    heartbeatTimeoutSeconds: Number(p.heartbeat_timeout_seconds || 30),
    allowCentralWhenLocalOffline: Number(p.allow_central_when_local_offline ?? 1) === 1,
    blockOnlineWhenLocalLive: Number(p.block_online_when_local_live ?? 1) === 1,
  };
}

export async function getTheatreHealth(theatreId: string) {
  await ensureCentralSchemaAndSeed();
  const db = getDb();
  const [tRows] = await db.query(`SELECT * FROM theatres WHERE theatre_id=? LIMIT 1`, [theatreId]);
  const t: any = rows<any>(tRows)[0];
  const policy = await getPolicy();
  const last = t?.last_heartbeat_utc ? new Date(`${t.last_heartbeat_utc}Z`).getTime() : 0;
  const heartbeatHealthy = !!last && Date.now() - last <= policy.heartbeatTimeoutSeconds * 1000;
  let authority: Authority = 'BLOCKED';
  if (heartbeatHealthy && policy.blockOnlineWhenLocalLive) authority = 'LOCAL';
  else if (policy.allowCentralWhenLocalOffline) authority = 'ONLINE';
  return { theatre: t, policy, heartbeatHealthy, authority };
}
