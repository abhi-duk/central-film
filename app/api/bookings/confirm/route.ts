import { NextRequest, NextResponse } from 'next/server';
import { readMysqlStore, markTimedOutTheatres } from '../../../../lib/store';
import { determineAuthority } from '../../../../lib/authority';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { holdId, showId, paymentMode, authorityVersion } = body || {};

    if (!holdId || !showId) {
      return NextResponse.json(
        { success: false, message: 'holdId and showId are required' },
        { status: 400 }
      );
    }

    const timeoutSeconds = Number(process.env.HEARTBEAT_TIMEOUT_SECONDS || 30);

    // First, update timeout-based theatre state in DB
    await markTimedOutTheatres(timeoutSeconds);

    // Then read the latest store snapshot
    const store = await readMysqlStore();

    const theatre = store.theatres[0];
    if (!theatre) {
      return NextResponse.json(
        { success: false, message: 'Theatre not configured' },
        { status: 500 }
      );
    }

    const authority = determineAuthority(theatre);

    if (authorityVersion && theatre.updatedAt && authorityVersion !== theatre.updatedAt) {
      return NextResponse.json(
        {
          success: false,
          message: 'Authority changed. Please refresh and try again.',
        },
        { status: 409 }
      );
    }

    // LOCAL authority: local confirms, central mirror happens later via sync worker
    if (authority === 'LOCAL') {
      if (!theatre.localPublicUrl) {
        return NextResponse.json(
          {
            success: false,
            message: 'Theatre public URL is not configured.',
          },
          { status: 500 }
        );
      }

      const localConfirmUrl = `${theatre.localPublicUrl}/api/booking/confirm`;

      const res = await fetch(localConfirmUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-request-source': 'CENTRAL_ONLINE',
        },
        body: JSON.stringify({
          holdId,
          showId,
          paymentMode: paymentMode || 'DIGITAL',
          requestSource: 'CENTRAL_ONLINE',
        }),
        cache: 'no-store',
      });

      const text = await res.text();
      let data: any = null;

      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }

      if (!res.ok || !data?.success) {
        return NextResponse.json(
          {
            success: false,
            message: data?.message || 'Could not confirm booking from theatre server',
          },
          { status: res.status || 500 }
        );
      }

      // IMPORTANT:
      // Do NOT wait for central DB mirror write here.
      // Local booking is already final and sync worker will push it to central.
      return NextResponse.json({
        success: true,
        bookingId: data.bookingId,
        ticketNumber: data.ticketNumber,
        booking: data.booking || null,
        source: 'LOCAL_AUTHORITY',
        syncPending: true,
        message: 'Ticket issued. Central sync will complete in the background.',
      });
    }

    // ONLINE authority path can remain as your current central-confirm logic
    if (authority === 'ONLINE') {
      return NextResponse.json(
        {
          success: false,
          message: 'ONLINE authority confirm path is not yet patched in this step.',
        },
        { status: 501 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Booking is currently paused.' },
      { status: 409 }
    );
  } catch (error) {
    console.error('POST /api/bookings/confirm failed:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to confirm booking' },
      { status: 500 }
    );
  }
}