import { NextRequest, NextResponse } from 'next/server';
import { getHoldDetails } from '@/lib/store';

export async function GET(req: NextRequest) {
  const holdId = req.nextUrl.searchParams.get('holdId') || '';
  const showId = req.nextUrl.searchParams.get('showId') || undefined;
  if (!holdId) return NextResponse.json({ success: false, message: 'holdId is required' }, { status: 400 });
  const hold = await getHoldDetails(holdId, showId);
  return NextResponse.json({ success: Boolean(hold), hold }, { status: hold ? 200 : 404 });
}
