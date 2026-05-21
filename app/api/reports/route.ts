import { NextResponse } from 'next/server';
import { ensureCentralSchemaAndSeed } from '../../../lib/bootstrap';
import { getDb, rows } from '../../../lib/db';
import { safeJson } from '../../../lib/show';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    await ensureCentralSchemaAndSeed();
    const db = getDb();
    const [bookRows] = await db.query(`SELECT * FROM central_bookings ORDER BY created_at_utc DESC LIMIT 100`);
    const [payRows] = await db.query(`SELECT * FROM payment_transactions ORDER BY created_at_utc DESC LIMIT 100`);
    const bookings = rows<any>(bookRows);
    const payments = rows<any>(payRows);
    const confirmed = bookings.filter((b: any) => b.booking_status === 'CONFIRMED').length;
    const local = bookings.filter((b: any) => String(b.booking_source).startsWith('LOCAL')).length;
    const pendingPayments = payments.filter((p: any) => p.transaction_state === 'PENDING_CONFIRMATION').length;
    const tickets = bookings.reduce((s: number, b: any) => s + Number(b.total_tickets || 0), 0);
    return NextResponse.json({
      success: true,
      stats: { confirmed, tickets, local, pendingPayments },
      bookings: bookings.map((b: any) => ({
        bookingId: b.booking_id,
        ticketNumber: b.ticket_number,
        movieTitle: b.movie_title,
        seats: safeJson<string[]>(b.seats_json, []),
        bookingSource: b.booking_source,
        reconciliationStatus: b.reconciliation_status,
        confirmedAtUtc: b.confirmed_at_utc ? new Date(`${b.confirmed_at_utc}Z`).toISOString() : null,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: `Could not load reports: ${error?.message || 'database not connected'}`, stats: { confirmed: 0, tickets: 0, local: 0, pendingPayments: 0 }, bookings: [] });
  }
}
