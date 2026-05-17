import { NextRequest, NextResponse } from 'next/server';
import { readStore, writeStore } from '../../../lib/store';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const store = await readStore();
  const row = store.pending.find((p) => p.sessionId === body.sessionId);
  if (!row) return NextResponse.json({ success: false }, { status: 404 });
  row.state = body.state;
  row.resolvedAt = new Date().toISOString();
  await writeStore(store);
  return NextResponse.json({ success: true, row });
}
