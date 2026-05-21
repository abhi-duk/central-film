import { NextResponse } from 'next/server';
import { getTheatreHealth } from '../../../../../lib/authority';

export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: { params: Promise<{ theatreId: string }> }) {
  try {
    const { theatreId } = await params;
    const health = await getTheatreHealth(theatreId);
    return NextResponse.json({ success: true, theatreId, authority: health.authority, heartbeatHealthy: health.heartbeatHealthy, policy: health.policy });
  } catch (error) {
    console.error('authority failed', error);
    return NextResponse.json({ success: false, authority: 'BLOCKED', heartbeatHealthy: false }, { status: 500 });
  }
}
