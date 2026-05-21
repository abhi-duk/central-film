import { NextRequest, NextResponse } from 'next/server';
import { receiveHeartbeat } from '@/lib/store';

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-central-secret');
  if (process.env.CENTRAL_SHARED_SECRET && secret !== process.env.CENTRAL_SHARED_SECRET) {
    return NextResponse.json({ success: false, message: 'Invalid shared secret' }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  return NextResponse.json(await receiveHeartbeat(body));
}
