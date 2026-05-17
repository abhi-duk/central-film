import { NextRequest, NextResponse } from 'next/server';
import { determineAuthority } from '../../../lib/authority';
import { readStore, writeStore } from '../../../lib/store';

const TIMEOUT_SECONDS = Number(process.env.HEARTBEAT_TIMEOUT_SECONDS || 20);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const store = await readStore();
  const theatre = store.theatres.find((t) => t.theatreId === body.theatreId);
  if (!theatre) return NextResponse.json({ success: false, message: 'Unknown theatre' }, { status: 404 });

  theatre.lastHeartbeatAt = body.sentAt || new Date().toISOString();
  theatre.updatedAt = new Date().toISOString();
  theatre.heartbeatStatus = 'ONLINE';
  theatre.health = {
    appHealthy: !!body.appHealthy,
    dbHealthy: !!body.dbHealthy,
    bookingApiHealthy: !!body.bookingApiHealthy,
  };
  theatre.currentAuthority = 'LOCAL';

  await writeStore(store);
  return NextResponse.json({ success: true, theatre });
}

export async function GET() {
  const store = await readStore();
  const now = Date.now();
  let changed = false;
  for (const theatre of store.theatres) {
    const age = !theatre.lastHeartbeatAt ? Number.POSITIVE_INFINITY : (now - new Date(theatre.lastHeartbeatAt).getTime()) / 1000;
    const healthy = age <= TIMEOUT_SECONDS;
    const nextHeartbeat = healthy ? 'ONLINE' : 'OFFLINE';
    const nextAuthority = healthy ? 'LOCAL' : determineAuthority({ ...theatre, heartbeatStatus: 'OFFLINE' } as any);
    if (theatre.heartbeatStatus !== nextHeartbeat || theatre.currentAuthority !== nextAuthority) {
      theatre.heartbeatStatus = nextHeartbeat as any;
      theatre.currentAuthority = nextAuthority as any;
      theatre.updatedAt = new Date().toISOString();
      changed = true;
    }
  }
  if (changed) await writeStore(store);
  return NextResponse.json({ success: true, theatres: store.theatres });
}
