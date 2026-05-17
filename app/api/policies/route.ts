import { NextRequest, NextResponse } from 'next/server';
import { readStore, writeStore } from '../../../lib/store';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const store = readStore();
  const theatre = store.theatres.find((t) => t.theatreId === body.theatreId);
  if (!theatre) return NextResponse.json({ success: false }, { status: 404 });

  theatre.name = body.name;
  theatre.localPublicUrl = body.localPublicUrl;
  theatre.workingHoursStart = body.workingHoursStart;
  theatre.workingHoursEnd = body.workingHoursEnd;
  theatre.outageModeWorkingHours = body.outageModeWorkingHours;
  theatre.outageModeOffHours = body.outageModeOffHours;
  theatre.leadTimeCutoffMin = Number(body.leadTimeCutoffMin) || 120;
  theatre.updatedAt = new Date().toISOString();

  writeStore(store);
  return NextResponse.json({ success: true, theatre });
}
