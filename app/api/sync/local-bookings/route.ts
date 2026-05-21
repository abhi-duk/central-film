import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

function safeJsonString(value: any) {
  try {
    return JSON.stringify(value ?? null);
  } catch {
    return 'null';
  }
}

function toMysqlDateTime(iso?: string | null) {
  if (!iso) return null;
  try {
    return new Date(iso).toISOString().slice(0, 19).replace('T', ' ');
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const theatreId = body?.theatreId;

    // Support both batch and single-booking payloads
    const bookings = Array.isArray(body?.bookings)
      ? body.bookings
      : body?.bookingId
      ? [body]
      : [];

    if (!theatreId) {
      return NextResponse.json(
        { success: false, message: 'theatreId is required' },
        { status: 400 }
      );
    }

    if (!bookings.length) {
      return NextResponse.json({ success: true, results: [] });
    }

    const db: any = getDb();
    const results: Array<{ bookingId: string; status: string; message?: string }> = [];

    for (const b of bookings) {
      const bookingId = b?.bookingId;
      if (!bookingId) {
        results.push({
          bookingId: '',
          status: 'conflict',
          message: 'Missing bookingId',
        });
        continue;
      }

      try {
        const [existingRowsRaw] = await db.query(
          `SELECT booking_id FROM bookings WHERE booking_id = ? LIMIT 1`,
          [bookingId]
        );
        const existingRows = Array.isArray(existingRowsRaw) ? existingRowsRaw : [];
        const exists = existingRows[0];

        if (exists) {
          results.push({
            bookingId,
            status: 'already_exists',
          });
          continue;
        }

        await db.query(
          `
          INSERT INTO bookings (
            booking_id,
            ticket_number,
            theatre_id,
            show_id,
            movie_title,
            theatre_name,
            show_time_utc,
            show_label,
            total_tickets,
            seats_json,
            pricing_json,
            booking_source,
            booking_status,
            reconciliation_status,
            payment_mode,
            hold_id,
            session_id,
            idempotency_key,
            request_ip,
            source_label,
            held_at_utc,
            confirmed_at_utc,
            synced_at,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', 'SYNCED_TO_CENTRAL', ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())
          `,
          [
            bookingId,
            b.ticketNumber || null,
            b.theatreId || theatreId,
            b.showId || null,
            b.movieTitle || null,
            b.theatreName || null,
            toMysqlDateTime(b.showTimeUtc),
            b.showLabel || null,
            Number(b.totalTickets || 0),
            safeJsonString(b.seats || []),
            safeJsonString(b.pricing || null),
            b.bookingSource || 'AUDIT_COPY_FROM_LOCAL',
            b.paymentMode || null,
            b.holdId || null,
            b.sessionId || null,
            b.idempotencyKey || null,
            b.requestIp || null,
            b.sourceLabel || null,
            toMysqlDateTime(b.heldAtUtc),
            toMysqlDateTime(b.confirmedAtUtc),
          ]
        );

        results.push({
          bookingId,
          status: 'inserted',
        });
      } catch (err: any) {
        results.push({
          bookingId,
          status: 'conflict',
          message: err?.message || 'Insert failed',
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('POST /api/sync/local-bookings failed:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to sync local bookings' },
      { status: 500 }
    );
  }
}