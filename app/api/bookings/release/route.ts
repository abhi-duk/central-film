import { NextRequest, NextResponse } from 'next/server';
import { releaseHold } from '@/lib/store';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const result = await releaseHold({ holdId: body.holdId, showId: body.showId, reason: body.reason || 'RELEASED' });
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
