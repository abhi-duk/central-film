import { NextRequest, NextResponse } from 'next/server';
import { holdSeats } from '@/lib/store';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  if (!Array.isArray(body.seatIds) || !body.seatIds.length) {
    return NextResponse.json({ success: false, message: 'Select at least one seat.' }, { status: 400 });
  }
  const result = await holdSeats(body);
  return NextResponse.json(result, { status: result.success ? 200 : 409 });
}
