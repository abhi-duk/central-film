import { NextRequest, NextResponse } from 'next/server';
import { ensureCentralSchemaAndSeed } from '../../../../lib/bootstrap';
import { getDb, rows } from '../../../../lib/db';
import { rebuildShowRuntimeSnapshot } from '../../../../lib/snapshot';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let conn: any;
  try {
    await ensureCentralSchemaAndSeed();
    const body = await req.json();
    const bookingId = body.bookingId || body.booking_id;
    const showId = body.showId || body.show_id;
    const theatreId = body.theatreId || body.theatre_id || process.env.THEATRE_ID || 'KSFDC_SREE_TVM';
    const seats: string[] = Array.isArray(body.seats) ? body.seats.map(String) : [];
    if (!bookingId || !showId || seats.length === 0) return NextResponse.json({ success: false, message: 'bookingId, showId and seats are required' }, { status: 400 });
    const db = getDb();
    conn = await db.getConnection();
    await conn.beginTransaction();
    const placeholders = seats.map(() => '?').join(',');
    const [existingRows] = await conn.query(`SELECT seat_id, booking_id FROM booking_seats WHERE show_id=? AND seat_id IN (${placeholders}) FOR UPDATE`, [showId, ...seats]);
    const conflicts = rows<any>(existingRows).filter((r:any) => r.booking_id !== bookingId);
    if (conflicts.length) {
      await conn.query(`INSERT INTO local_booking_sync (booking_id, theatre_id, show_id, payload_json, sync_status, conflict_reason) VALUES (?, ?, ?, ?, 'CONFLICT', ?) ON DUPLICATE KEY UPDATE sync_status='CONFLICT', conflict_reason=VALUES(conflict_reason), payload_json=VALUES(payload_json)`, [bookingId, theatreId, showId, JSON.stringify(body), `Seat conflict: ${conflicts.map((c:any)=>c.seat_id).join(', ')}`]);
      await conn.commit();
      return NextResponse.json({ success: false, conflict: true, message: `Seat conflict: ${conflicts.map((c:any)=>c.seat_id).join(', ')}` }, { status: 409 });
    }
    const [showRows] = await conn.query(`SELECT * FROM shows WHERE show_id=? LIMIT 1`, [showId]);
    const show: any = rows<any>(showRows)[0];
    await conn.query(`INSERT INTO central_bookings (booking_id, ticket_number, theatre_id, show_id, movie_title, theatre_name, show_time_utc, show_label, seats_json, pricing_json, total_tickets, booking_source, booking_status, reconciliation_status, payment_mode, hold_id, session_id, idempotency_key, request_ip, source_label, confirmed_at_utc, synced_at_utc)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'RECONCILED', ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())
      ON DUPLICATE KEY UPDATE reconciliation_status='RECONCILED', synced_at_utc=UTC_TIMESTAMP()`,
      [bookingId, body.ticketNumber || `L-${Date.now()}`, theatreId, showId, body.movieTitle || show?.movie_title || 'Movie', body.theatreName || show?.theatre_name || 'Theatre', show?.show_time_utc || new Date(), body.showLabel || null, JSON.stringify(seats), JSON.stringify(body.pricing || null), Number(body.totalTickets || seats.length), body.bookingSource || 'LOCAL_COUNTER', body.bookingStatus || 'CONFIRMED', body.paymentMode || null, body.holdId || null, body.sessionId || null, body.idempotencyKey || null, body.requestIp || null, body.sourceLabel || 'Local counter', body.confirmedAtUtc ? new Date(body.confirmedAtUtc).toISOString().slice(0,19).replace('T',' ') : new Date().toISOString().slice(0,19).replace('T',' ')]);
    for (const seatId of seats) await conn.query(`INSERT IGNORE INTO booking_seats (booking_id, show_id, seat_id) VALUES (?, ?, ?)`, [bookingId, showId, seatId]);
    await conn.query(`UPDATE show_seats SET seat_status='BOOKED', booking_id=?, hold_id=NULL, hold_expires_at_utc=NULL WHERE show_id=? AND seat_id IN (${placeholders})`, [bookingId, showId, ...seats]);
    await conn.query(`INSERT INTO local_booking_sync (booking_id, theatre_id, show_id, payload_json, sync_status) VALUES (?, ?, ?, ?, 'RECEIVED') ON DUPLICATE KEY UPDATE sync_status='RECEIVED', payload_json=VALUES(payload_json)`, [bookingId, theatreId, showId, JSON.stringify(body)]);
    await rebuildShowRuntimeSnapshot(showId, conn);
    await conn.commit();
    return NextResponse.json({ success: true, bookingId, status: 'RECONCILED' });
  } catch (error) {
    if (conn) { try { await conn.rollback(); } catch {} }
    console.error('local sync failed', error);
    return NextResponse.json({ success: false, message: 'Could not sync local booking' }, { status: 500 });
  } finally { if (conn) conn.release(); }
}
