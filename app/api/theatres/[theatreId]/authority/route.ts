import { NextResponse } from 'next/server';
import { determineAuthority, heartbeatHealthy } from '../../../../../lib/authority';
import { markTimedOutTheatres, readMysqlStore } from '../../../../../lib/store';

export async function GET(_: Request, { params }: { params: Promise<{ theatreId: string }> }) {
  try {
    const { theatreId } = await params;
    await markTimedOutTheatres(Number(process.env.HEARTBEAT_TIMEOUT_SECONDS || 30));
    const store = await readMysqlStore();
    const theatre = store.theatres.find(t => t.theatreId === theatreId);
    if (!theatre) return NextResponse.json({ success: false, message: 'Theatre not found' }, { status: 404 });
    const authority = determineAuthority(theatre);
    return NextResponse.json({ success: true, heartbeatHealthy: heartbeatHealthy(theatre), authority, localPublicUrl: theatre.localPublicUrl || process.env.LOCAL_PUBLIC_URL || '', theatre });
  } catch (error) {
    console.error('authority route failed:', error);
    return NextResponse.json({ success: false, heartbeatHealthy: false, authority: 'BLOCKED', message: 'Theatre connection could not be checked right now.' }, { status: 200 });
  }
}
