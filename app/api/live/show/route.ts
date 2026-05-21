import { NextRequest, NextResponse } from 'next/server';
import { getLiveShow } from '@/lib/store';

export async function GET(request: NextRequest) {
  const showId = request.nextUrl.searchParams.get('showId') || 'SHOW_EMP_001';
  const data = await getLiveShow(showId);
  return NextResponse.json(data);
}
