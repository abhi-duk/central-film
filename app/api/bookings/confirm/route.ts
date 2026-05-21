import { NextRequest, NextResponse } from 'next/server';
import { confirmHold } from '@/lib/store';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  if (!body.holdId) {
    return NextResponse.json({ success: false, message: 'holdId is required' }, { status: 400 });
  }
  const result = await confirmHold({ holdId: body.holdId, showId: body.showId });
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
