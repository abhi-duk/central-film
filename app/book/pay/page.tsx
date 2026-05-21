'use client';

import { useEffect, useMemo, useState } from 'react';

function money(v:number){ return `₹${v.toFixed(2)}`; }
function beep(){ if(typeof window==='undefined' || !window.AudioContext) return; try{ const ctx=new window.AudioContext(); const osc=ctx.createOscillator(); const gain=ctx.createGain(); osc.frequency.value=740; gain.gain.value=.05; osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime+.12);}catch{} }
function speak(text:string){ if(typeof window==='undefined' || !('speechSynthesis' in window)) return; const u=new SpeechSynthesisUtterance(text); const voices=window.speechSynthesis.getVoices(); const preferred=voices.find(v=>/female|zira|samantha|google uk english female|heera/i.test(v.name)); if(preferred) u.voice=preferred; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); }

export default function PayPage() {
  const params = useMemo(() => new URLSearchParams(typeof window !== 'undefined' ? window.location.search : ''), []);
  const holdId = params.get('holdId') || '';
  const [seconds, setSeconds] = useState(60);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');
  const [paymentMode, setPaymentMode] = useState<'DIGITAL'|'CASH'>('DIGITAL');
  const [data, setData] = useState<any>(null);

  useEffect(() => { fetch(`/api/bookings/hold-details?holdId=${encodeURIComponent(holdId)}`, { cache: 'no-store' }).then(r=>r.text()).then(t=>{ try{ return t?JSON.parse(t):null }catch{ return null } }).then(d=>{ if(d?.success){ setData(d); const seats=d.hold?.seats?.length||0; const total=d.hold?.pricing?.total||0; beep(); speak(`${seats} seats selected. Total amount ${Math.round(total)} rupees.`); } }); }, [holdId]);
  useEffect(() => { const t = setInterval(() => setSeconds(s => Math.max(0, s - 1)), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { if (seconds === 0 && holdId) { setMessage('Hold time expired. Releasing seats...'); fetch('/api/bookings/release', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ holdId }) }).finally(() => { window.location.href = '/book'; }); } }, [seconds, holdId]);

  const act = async (kind:'success'|'fail') => {
    if (working) return; setWorking(true); setMessage(kind === 'success' ? 'Finalising booking…' : 'Releasing held seats…');
    try {
      const url = kind === 'success' ? '/api/bookings/confirm' : '/api/bookings/release';
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ holdId, paymentMode }) });
      const text = await res.text(); let out:any=null; try{ out=text?JSON.parse(text):null }catch{}
      if (kind === 'success') {
        if (out?.success && out?.bookingId) { window.location.href = `/ticket/${encodeURIComponent(out.bookingId)}`; return; }
        setMessage(out?.message || 'Could not confirm booking. Seats remain held until timer ends or you release them.');
      } else { window.location.href = '/book'; }
    } catch { setMessage(kind === 'success' ? 'Could not confirm booking right now.' : 'Could not release seats right now.'); }
    finally { setWorking(false); }
  };

  const pricing = data?.hold?.pricing;
  return <main className="payment-grid">
    <section className="panel-card p-6">
      <div className="eyebrow">Payment confirmation</div>
      <h1 className="page-title">Confirm booking within {seconds}s</h1>
      <p className="page-subtitle">Seats are temporarily locked for this customer while payment is completed.</p>
      <div className="mt-6 grid gap-3 text-sm">
        <div className="summary-line"><span>Film</span><strong>{data?.show?.movieTitle || 'Loading…'}</strong></div>
        <div className="summary-line"><span>Show</span><strong>{data?.show ? `${data.show.dayLabel}, ${data.show.dateLabel}` : '—'}</strong></div>
        <div className="summary-line"><span>Time</span><strong>{data?.show ? `${data.show.timeLabel} • ${data.show.slot}` : '—'}</strong></div>
        <div className="summary-line"><span>No. of Tickets</span><strong>{data?.hold?.seats?.length || 0}</strong></div>
        <div className="summary-line"><span>Selected Seats</span><strong>{(data?.hold?.seats || []).join(', ') || '—'}</strong></div>
      </div>
      <div className="mt-6 rounded-2xl border border-[var(--border)] p-4">
        <div className="eyebrow">Payment mode</div>
        <div className="mt-3 flex gap-3"><label className="seat-pill"><input type="radio" checked={paymentMode==='DIGITAL'} onChange={()=>setPaymentMode('DIGITAL')} /> Digital Payment</label><label className="seat-pill"><input type="radio" checked={paymentMode==='CASH'} onChange={()=>setPaymentMode('CASH')} /> Cash Payment</label></div>
      </div>
      <div className="mt-5 min-h-[24px] text-sm text-amber-300">{message || '\u00A0'}</div>
      <div className="mt-6 flex flex-wrap gap-3"><button className="btn btn-primary" disabled={working} onClick={()=>act('success')}>Payment received, issue ticket</button><button className="btn btn-danger" disabled={working} onClick={()=>act('fail')}>Payment failed, release seats</button></div>
    </section>
    <aside className="panel-card p-6">
      <div className="eyebrow">Amount summary</div>
      <div className="summary-line mt-4"><span>Net Amount</span><strong>{money(pricing?.net || 0)}</strong></div>
      <div className="summary-line"><span>GST</span><strong>{money(pricing?.gst || 0)}</strong></div>
      <div className="summary-line"><span>Entertainment Tax</span><strong>{money(pricing?.entertainmentTax || 0)}</strong></div>
      <div className="summary-line"><span>Cess</span><strong>{money(pricing?.cess || 0)}</strong></div>
      <div className="summary-total mt-4"><span>Total Amount</span><span>{money(pricing?.total || 0)}</span></div>
      <div className="mt-4 mini-note">A simple female voice alert announces seat count and final amount when this page opens.</div>
    </aside>
  </main>;
}
