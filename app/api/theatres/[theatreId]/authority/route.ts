import { NextRequest, NextResponse } from 'next/server';
import { determineAuthority, heartbeatHealthy } from '../../../../../lib/authority';
import { readStore, writeStore } from '../../../../../lib/store';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ theatreId: string }> }
) {
  const { theatreId } = await params;
  const showTime = req.nextUrl.searchParams.get('showTime') || undefined;
  const store = await readStore();
  const theatre = store.theatres.find((t) => t.theatreId === theatreId);
  if (!theatre) return NextResponse.json({ success: false }, { status: 404 });

  const healthy = heartbeatHealthy(theatre);
  theatre.heartbeatStatus = healthy ? 'ONLINE' : 'OFFLINE';
  theatre.currentAuthority = determineAuthority(theatre, showTime);
  theatre.updatedAt = new Date().toISOString();
  await writeStore(store);

  return NextResponse.json({
    success: true,
    heartbeatHealthy: healthy,
    authority: theatre.currentAuthority,
    localPublicUrl: theatre.localPublicUrl,
    theatre,
  });
}
