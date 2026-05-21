import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export async function POST() { return NextResponse.json({ success: true, message: 'Central accepts local push at /api/sync/local-bookings. No pending central push queue in this build.' }); }
