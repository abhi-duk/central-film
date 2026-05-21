import { NextRequest, NextResponse } from 'next/server';
import { ensureCentralSchema, getPolicy, updatePolicy } from '@/lib/store';
import { getDb } from '@/lib/db';

export async function GET() {
  await ensureCentralSchema();
  await getDb();
  return NextResponse.json({ success: true, policy: await getPolicy() });
}

export async function POST(req: NextRequest) {
  try {
    await ensureCentralSchema();
    const body = await req.json().catch(() => ({}));
    const policy = await updatePolicy({
      holdMinutes: Number(body.holdMinutes ?? body.hold_minutes ?? 8),
      paymentGraceSeconds: Number(body.paymentGraceSeconds ?? body.payment_grace_seconds ?? 90),
      heartbeatTimeoutSeconds: Number(body.heartbeatTimeoutSeconds ?? body.heartbeat_timeout_seconds ?? 120),
      allowCentralFallback: Boolean(body.allowCentralFallback ?? body.allow_central_fallback ?? false),
    });
    return NextResponse.json({ success: true, policy });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || 'Policy update failed' }, { status: 500 });
  }
}
