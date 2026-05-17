import { NextRequest, NextResponse } from 'next/server';
import { determineAuthority } from '../../../lib/authority';

const HEARTBEAT_TIMEOUT_SECONDS = Number(process.env.HEARTBEAT_TIMEOUT_SECONDS || 20);
import { readStore, writeStore } from '../../../lib/store';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const store = readStore();
  const theatre = store.theatres.find((t) => t.theatreId === body.theatreId);
  if (!theatre) {
    return NextResponse.json({ success: false, message: 'Unknown theatre' }, { status: 404 });
  }

  theatre.lastHeartbeatAt = body.sentAt || new Date().toISOString();
  theatre.updatedAt = new Date().toISOString();
  theatre.heartbeatStatus = 'ONLINE';
  theatre.health = {
    appHealthy: !!body.appHealthy,
    dbHealthy: !!body.dbHealthy,
    bookingApiHealthy: !!body.bookingApiHealthy,
  };
  theatre.currentAuthority = determineAuthority(theatre);

  writeStore(store);
  return NextResponse.json({ success: true, theatre });
}

export async function GET() {
  const store = readStore();
  const now = Date.now();
  let changed = false;
  for (const theatre of store.theatres) {
    if (!theatre.lastHeartbeatAt || (now - new Date(theatre.lastHeartbeatAt).getTime()) / 1000 > HEARTBEAT_TIMEOUT_SECONDS) {
      theatre.heartbeatStatus = 'OFFLINE';
      theatre.currentAuthority = determineAuthority(theatre);
      theatre.updatedAt = new Date().toISOString();
      changed = true;
    }
  }
  if (changed) writeStore(store);
  return NextResponse.json({ success: true, theatres: store.theatres });
}
