import { NextRequest, NextResponse } from 'next/server';
import { determineAuthority, heartbeatHealthy, onlineBookingAllowed } from '../../../../lib/authority';
import { markTimedOutTheatres, readMysqlStore } from '../../../../lib/store';
import { describeShow } from '../../../../lib/show';

function templateSeatMap() {
  const out: Record<string, { status: 'AVAILABLE' | 'HELD' | 'BOOKED' }> = {};
  for (const row of 'ABCDEFGHIJ'.split('')) for (let i = 1; i <= 16; i++) out[`${row}${i}`] = { status: 'AVAILABLE' };
  return out;
}
const showMeta: Record<string, { time: string; movieTitle: string; theatreName: string; pricing: any }> = {
  SHOW_EMP_001: { time: new Date(Date.now() + 2 * 3600 * 1000).toISOString(), movieTitle: 'L2: Empuraan', theatreName: 'KSFDC Sree, TVM', pricing: { premiumRate:260, executiveRate:190, economyRate:130, gstPct:12, entertainmentTaxPct:5, cessPct:1 } },
  SHOW_OD_001: { time: new Date(Date.now() + 4 * 3600 * 1000).toISOString(), movieTitle: 'Officer on Duty', theatreName: 'KSFDC Sree, TVM', pricing: { premiumRate:220, executiveRate:170, economyRate:120, gstPct:12, entertainmentTaxPct:5, cessPct:1 } },
};

export async function GET(req: NextRequest) {
  const showId = req.nextUrl.searchParams.get('showId');
  if (!showId) return NextResponse.json({ success: false, message: 'showId required' }, { status: 400 });
  await markTimedOutTheatres(Number(process.env.HEARTBEAT_TIMEOUT_SECONDS || 30));
  const store = await readMysqlStore();
  const theatre = store.theatres[0];
  const meta = showMeta[showId];
  const authority = determineAuthority(theatre, meta?.time);
  const healthy = heartbeatHealthy(theatre);
  const canBookOnline = onlineBookingAllowed(theatre, meta?.time);
  if (!canBookOnline) {
    return NextResponse.json({ success: true, authority, heartbeatHealthy: healthy, canBookOnline: false, seatMap: null, seatClasses: null, pricing: meta?.pricing, show: { showId, movieTitle: meta?.movieTitle, time: meta?.time, theatreName: theatre.name, ...describeShow(meta?.time || new Date().toISOString()) }, message: theatre.recoveryState === 'RECOVERING' ? 'The theatre connection is back. Recovery sync is still running.' : 'This theatre is offline right now.' });
  }
  if (!healthy && authority === 'ONLINE') {
    const seatMap = templateSeatMap(); const seatClasses:any={};
    for (const row of 'ABCDEFGHIJ'.split('')) for (let i=1;i<=16;i++) seatClasses[`${row}${i}`]= ['A','B','C'].includes(row)?'PREMIUM':['D','E','F'].includes(row)?'EXECUTIVE':'ECONOMY';
    store.bookings.filter(b => b.showId === showId && b.bookingStatus === 'CONFIRMED').forEach(b => b.seats.forEach((s:string) => { if (seatMap[s]) seatMap[s].status = 'BOOKED'; }));
    return NextResponse.json({ success: true, authority, heartbeatHealthy: healthy, canBookOnline: true, seatMap, seatClasses, pricing: meta?.pricing, show: { showId, movieTitle: meta?.movieTitle, time: meta?.time, theatreName: theatre.name, ...describeShow(meta?.time || new Date().toISOString()) }, message: 'The theatre internet is down. Central online booking is handling new bookings now.' });
  }
  const localBase = theatre.localPublicUrl || process.env.LOCAL_PUBLIC_URL || '';
  if (!localBase) return NextResponse.json({ success: true, authority: 'BLOCKED', heartbeatHealthy: false, canBookOnline: false, seatMap: null, show: { showId, movieTitle: meta?.movieTitle, time: meta?.time, theatreName: theatre.name }, message: 'Theatre local server URL is not configured.' });
  try {
    const res = await fetch(`${localBase}/api/public/show/${showId}`, { cache: 'no-store' });
    const text = await res.text(); let data:any=null; try{data=text?JSON.parse(text):null}catch{}
    if (!res.ok || !data?.success) throw new Error('Local show load failed');
    return NextResponse.json({ success: true, authority, heartbeatHealthy: healthy, canBookOnline: true, seatMap: data.seatMap || {}, seatClasses: data.seatClasses || {}, pricing: data.pricing, show: data.show, message: 'Live theatre seat status loaded.' });
  } catch (error) {
    console.error('live show fetch error', error);
    return NextResponse.json({ success: true, authority: 'BLOCKED', heartbeatHealthy: false, canBookOnline: false, seatMap: null, show: { showId, movieTitle: meta?.movieTitle, time: meta?.time, theatreName: theatre.name }, message: 'The theatre server could not be reached right now.' });
  }
}
