import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { ensureCentralSchemaAndSeed } from '../../../../lib/bootstrap';
import { getDb, rows } from '../../../../lib/db';
import { describeShow, fromMysqlUtc, safeJson } from '../../../../lib/show';
import { rebuildShowRuntimeSnapshot } from '../../../../lib/snapshot';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let conn: any;
  try {
    await ensureCentralSchemaAndSeed();
    const body = await req.json();
    const holdId = body.holdId || '';
    const requestedShowId = body.showId || '';
    const paymentMode = body.paymentMode || 'DIGITAL';
    if (!holdId) return NextResponse.json({ success: false, message: 'holdId is required' }, { status: 400 });
    const db = getDb();
    conn = await db.getConnection();
    await conn.beginTransaction();
    const [holdRows] = await conn.query(`SELECT * FROM seat_holds WHERE hold_id=? ${requestedShowId ? 'AND show_id=?' : ''} LIMIT 1 FOR UPDATE`, requestedShowId ? [holdId, requestedShowId] : [holdId]);
    const hold: any = rows<any>(holdRows)[0];
    if (!hold) { await conn.rollback(); return NextResponse.json({ success: false, message: 'Hold not found' }, { status: 404 }); }
    const showId = hold.show_id;
    if (hold.hold_status !== 'HELD') { await conn.rollback(); return NextResponse.json({ success: false, message: hold.hold_status === 'CONFIRMED' ? 'Hold already confirmed' : 'Hold is not active' }, { status: 400 }); }
    if (new Date(`${hold.expires_at_utc}Z`).getTime() < Date.now()) {
      await conn.query(`UPDATE seat_holds SET hold_status='EXPIRED', released_at_utc=UTC_TIMESTAMP() WHERE hold_id=?`, [holdId]);
      await conn.query(`UPDATE show_seats SET seat_status='AVAILABLE', hold_id=NULL, hold_expires_at_utc=NULL WHERE hold_id=?`, [holdId]);
      await rebuildShowRuntimeSnapshot(showId, conn);
      await conn.commit();
      return NextResponse.json({ success: false, message: 'Hold expired' }, { status: 400 });
    }
    const [showRows] = await conn.query(`SELECT * FROM shows WHERE show_id=? LIMIT 1`, [showId]);
    const show: any = rows<any>(showRows)[0];
    const seats = safeJson<string[]>(hold.seat_ids_json, []);
    const pricing = safeJson<any>(hold.pricing_json, null);
    const bookingId = `BKG-CEN-${crypto.randomUUID()}`;
    const ticketNumber = `C-${Date.now()}`;
    const showTimeIso = fromMysqlUtc(show.show_time_utc);
    const showLabel = describeShow(showTimeIso).slot;
    await conn.query(`INSERT INTO central_bookings (booking_id, ticket_number, theatre_id, show_id, movie_title, theatre_name, show_time_utc, show_label, seats_json, pricing_json, total_tickets, booking_source, booking_status, reconciliation_status, payment_mode, hold_id, request_ip, source_label)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CENTRAL_ONLINE', 'CONFIRMED', 'CENTRAL_CONFIRMED', ?, ?, ?, ?)`,
      [bookingId, ticketNumber, show.theatre_id, show.show_id, show.movie_title, show.theatre_name, show.show_time_utc, showLabel, JSON.stringify(seats), JSON.stringify(pricing), seats.length, paymentMode, holdId, hold.request_ip, hold.source_label]);
    for (const seatId of seats) await conn.query(`INSERT IGNORE INTO booking_seats (booking_id, show_id, seat_id) VALUES (?, ?, ?)`, [bookingId, showId, seatId]);
    await conn.query(`UPDATE show_seats SET seat_status='BOOKED', booking_id=?, hold_id=NULL, hold_expires_at_utc=NULL WHERE hold_id=?`, [bookingId, holdId]);
    await conn.query(`UPDATE seat_holds SET hold_status='CONFIRMED', payment_mode=?, confirmed_at_utc=UTC_TIMESTAMP() WHERE hold_id=?`, [paymentMode, holdId]);
    await conn.query(`UPDATE payment_transactions SET transaction_state='CONFIRMED', confirmed_at_utc=UTC_TIMESTAMP() WHERE hold_id=?`, [holdId]);
    await rebuildShowRuntimeSnapshot(showId, conn);
    await conn.commit();
    return NextResponse.json({ success: true, bookingId, ticketNumber, showId, booking: { bookingId, ticketNumber, showId, seats, pricing, movieTitle: show.movie_title, theatreName: show.theatre_name } });
  } catch (error) {
    if (conn) { try { await conn.rollback(); } catch {} }
    console.error('central confirm failed', error);
    return NextResponse.json({ success: false, message: 'Could not confirm booking' }, { status: 500 });
  } finally { if (conn) conn.release(); }
}
