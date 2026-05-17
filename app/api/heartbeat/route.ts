import { NextRequest, NextResponse } from 'next/server';
import { determineAuthority } from '../../../lib/authority';
import { readStore, writeStore } from '../../../lib/store';

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
  theatre.currentAuthority = determineAuthority(theatre);

  await writeStore(store);
  return NextResponse.json({ success: true, theatre });
}

export async function GET() {
  const store = await readStore();
  const now = Date.now();
  let changed = false;
  for (const theatre of store.theatres) {
    if (!theatre.lastHeartbeatAt || (now - new Date(theatre.lastHeartbeatAt).getTime()) / 1000 > 60) {
      theatre.heartbeatStatus = 'OFFLINE';
      theatre.currentAuthority = determineAuthority(theatre);
      theatre.updatedAt = new Date().toISOString();
      changed = true;
    }
  }
  if (changed) await writeStore(store);
  return NextResponse.json({ success: true, theatres: store.theatres });
}
