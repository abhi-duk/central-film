import { NextResponse } from 'next/server';
import { determineAuthority, heartbeatHealthy } from '@/lib/authority';
import { markTimedOutTheatres, readMysqlStore } from '@/lib/store';

export async function GET(_: Request, { params }: { params: Promise<{ theatreId: string }> }) {
  const { theatreId } = await params;
  await markTimedOutTheatres();
  const store = await readMysqlStore();
  const healthy = heartbeatHealthy(store.heartbeatAt, store.policy?.heartbeatTimeoutSeconds || 120);
  const authority = determineAuthority({
    theatreStatus: store.theatreStatus,
    lastHeartbeatAt: store.heartbeatAt,
    allowCentralFallback: Boolean(store.policy?.allowCentralFallback),
    timeoutSeconds: store.policy?.heartbeatTimeoutSeconds || 120,
  });
  return NextResponse.json({ success: true, theatreId, authority, heartbeatHealthy: healthy, theatreStatus: store.theatreStatus, lastHeartbeatAt: store.heartbeatAt });
}
