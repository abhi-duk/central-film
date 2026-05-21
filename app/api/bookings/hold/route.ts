import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { ensureCentralSchemaAndSeed } from '../../../../lib/bootstrap';
import { getTheatreHealth, getPolicy } from '../../../../lib/authority';
import { getDb, rows } from '../../../../lib/db';
import { computePricing, describeShow, fromMysqlUtc } from '../../../../lib/show';
import { rebuildShowRuntimeSnapshot, releaseExpiredHolds } from '../../../../lib/snapshot';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let conn: any;
  try {
    await ensureCentralSchemaAndSeed();
    const { showId, seatIds, source, requestIp, sourceLabel } = await req.json();
    const selected: string[] = Array.isArray(seatIds) ? seatIds.map(String) : [];
    if (!showId || selected.length === 0) return NextResponse.json({ success: false, message: 'showId and seatIds are required' }, { status: 400 });
    const db = getDb();
    conn = await db.getConnection();
    await conn.beginTransaction();
    await releaseExpiredHolds(showId, conn);
    const [showRows] = await conn.query(`SELECT * FROM shows WHERE show_id=? LIMIT 1 FOR UPDATE`, [showId]);
    const show: any = rows<any>(showRows)[0];
    if (!show) { await conn.rollback(); return NextResponse.json({ success: false, message: 'Show not found' }, { status: 404 }); }
    const health = await getTheatreHealth(show.theatre_id);
    if (health.authority !== 'ONLINE') { await conn.rollback(); return NextResponse.json({ success: false, message: health.authority === 'LOCAL' ? 'Local theatre server is live. Central online booking is paused to avoid duplicate seat allocation.' : 'Booking is blocked by current policy.' }, { status: 409 }); }
    const placeholders = selected.map(() => '?').join(',');
    const [seatRowsRaw] = await conn.query(`SELECT seat_id, seat_status, seat_class FROM show_seats WHERE show_id=? AND seat_id IN (${placeholders}) FOR UPDATE`, [showId, ...selected]);
    const seatRows: any[] = rows<any>(seatRowsRaw);
    if (seatRows.length !== selected.length) { await conn.rollback(); return NextResponse.json({ success: false, message: 'Some seats not found' }, { status: 400 }); }
    if (seatRows.some(s => s.seat_status !== 'AVAILABLE')) { await conn.rollback(); return NextResponse.json({ success: false, message: 'Some seats are no longer available' }, { status: 409 }); }
    const [configRows] = await conn.query(`SELECT * FROM pricing_config WHERE config_id=1 LIMIT 1`);
    const config: any = rows<any>(configRows)[0];
    const pricing = computePricing({ seatClasses: seatRows.map(s => s.seat_class), premiumRate: Number(show.premium_rate), executiveRate: Number(show.executive_rate), economyRate: Number(show.economy_rate), gstPct: Number(config.gst_pct), entertainmentTaxPct: Number(config.entertainment_tax_pct), cessPct: Number(config.cess_pct) });
    const policy = await getPolicy();
    const holdId = `HOLD-CEN-${crypto.randomUUID()}`;
    const transactionId = `TXN-CEN-${crypto.randomUUID()}`;
    const expires = new Date(Date.now() + policy.holdSeconds * 1000).toISOString().slice(0,19).replace('T',' ');
    await conn.query(`INSERT INTO seat_holds (hold_id, transaction_id, theatre_id, show_id, seat_ids_json, pricing_json, hold_source, hold_status, request_ip, source_label, expires_at_utc) VALUES (?, ?, ?, ?, ?, ?, ?, 'HELD', ?, ?, ?)`, [holdId, transactionId, show.theatre_id, showId, JSON.stringify(selected), JSON.stringify(pricing), source || 'CENTRAL_ONLINE', requestIp || req.headers.get('x-forwarded-for') || 'central', sourceLabel || 'Central online', expires]);
    const [updateResult]: any = await conn.query(`UPDATE show_seats SET seat_status='HELD', hold_id=?, hold_expires_at_utc=? WHERE show_id=? AND seat_id IN (${placeholders}) AND seat_status='AVAILABLE'`, [holdId, expires, showId, ...selected]);
    if (Number(updateResult?.affectedRows || 0) !== selected.length) { await conn.rollback(); return NextResponse.json({ success: false, message: 'Some seats are no longer available' }, { status: 409 }); }
    await conn.query(`INSERT INTO payment_transactions (transaction_id, hold_id, show_id, transaction_state, amount) VALUES (?, ?, ?, 'PENDING_CONFIRMATION', ?)`, [transactionId, holdId, showId, pricing.total]);
    await rebuildShowRuntimeSnapshot(showId, conn);
    await conn.commit();
    const showTime = fromMysqlUtc(show.show_time_utc);
    return NextResponse.json({ success: true, holdId, showId, transactionId, amount: pricing.total, expiresAtUtc: new Date(`${expires}Z`).toISOString(), pricing, show: { showId, theatreName: show.theatre_name, movieTitle: show.movie_title, time: showTime, ...describeShow(showTime) }, seatClasses: Object.fromEntries(seatRows.map(s => [s.seat_id, s.seat_class])) });
  } catch (error) {
    if (conn) { try { await conn.rollback(); } catch {} }
    console.error('central hold failed', error);
    return NextResponse.json({ success: false, message: 'Could not hold seats' }, { status: 500 });
  } finally { if (conn) conn.release(); }
}
