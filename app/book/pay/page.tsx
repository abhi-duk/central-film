'use client';

import { useEffect, useMemo, useState } from 'react';

type HoldDetails = {
  success?: boolean;
  show?: {
    movieTitle?: string;
    dayLabel?: string;
    dateLabel?: string;
    timeLabel?: string;
    slot?: string;
    theatreName?: string;
  };
  hold?: {
    seats?: string[];
    pricing?: {
      net?: number;
      gst?: number;
      entertainmentTax?: number;
      cess?: number;
      total?: number;
    };
  };
};

function money(v: number) {
  return `₹${Number(v || 0).toFixed(2)}`;
}

function beep() {
  if (typeof window === 'undefined' || !window.AudioContext) return;
  try {
    const ctx = new window.AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 720;
    gain.gain.value = 0.04;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch {}
}

function speak(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  const u = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();

  const preferred =
    voices.find((v) => /zira|samantha|heera|female/i.test(v.name)) ||
    voices.find((v) => /google uk english female/i.test(v.name)) ||
    voices.find((v) => /google uk english/i.test(v.name)) ||
    voices.find((v) => /english/i.test(v.lang || ''));

  if (preferred) u.voice = preferred;

  u.rate = 0.94;
  u.pitch = 1.08;
  u.volume = 0.95;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

function badgeTone(slot?: string) {
  const s = (slot || '').toLowerCase();
  if (s.includes('morning')) return 'border-amber-400/25 bg-amber-500/15 text-amber-200';
  if (s.includes('afternoon')) return 'border-sky-400/25 bg-sky-500/15 text-sky-200';
  if (s.includes('evening')) return 'border-violet-400/25 bg-violet-500/15 text-violet-200';
  if (s.includes('night')) return 'border-fuchsia-400/25 bg-fuchsia-500/15 text-fuchsia-200';
  return 'border-white/10 bg-white/10 text-white';
}

export default function PayPage() {
  const params = useMemo(
    () => new URLSearchParams(typeof window !== 'undefined' ? window.location.search : ''),
    []
  );

  const holdId = params.get('holdId') || '';

  const [seconds, setSeconds] = useState(60);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');
  const [paymentMode, setPaymentMode] = useState<'DIGITAL' | 'CASH'>('DIGITAL');
  const [data, setData] = useState<HoldDetails | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!holdId) return;

      try {
        const res = await fetch(`/api/bookings/hold-details?holdId=${encodeURIComponent(holdId)}`, {
          cache: 'no-store',
        });

        const text = await res.text();
        let out: HoldDetails | null = null;

        try {
          out = text ? JSON.parse(text) : null;
        } catch {
          out = null;
        }

        if (!alive) return;

        if (out?.success) {
          setData(out);

          const seats = out.hold?.seats?.length || 0;
          const total = out.hold?.pricing?.total || 0;
          beep();
          speak(`${seats} seats selected. Total amount is ${Math.round(total)} rupees.`);
        } else {
          setMessage('Could not load booking details.');
        }
      } catch {
        if (!alive) return;
        setMessage('Could not load booking details.');
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [holdId]);

  useEffect(() => {
    const t = setInterval(() => {
      setSeconds((s) => Math.max(0, s - 1));
    }, 1000);

    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (seconds !== 0 || !holdId) return;

    setMessage('Hold time expired. Releasing seats...');

    fetch('/api/bookings/release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ holdId }),
    }).finally(() => {
      window.location.href = '/book';
    });
  }, [seconds, holdId]);

  const act = async (kind: 'success' | 'fail') => {
    if (working) return;

    setWorking(true);
    setMessage(kind === 'success' ? 'Confirming booking...' : 'Releasing held seats...');

    try {
      const url = kind === 'success' ? '/api/bookings/confirm' : '/api/bookings/release';

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holdId, paymentMode }),
      });

      const text = await res.text();
      let out: any = null;

      try {
        out = text ? JSON.parse(text) : null;
      } catch {
        out = null;
      }

      if (kind === 'success') {
        if (out?.success && out?.bookingId) {
          const syncPending = !!out?.syncPending;
          const source = out?.source || '';

          window.location.href = `/ticket/${encodeURIComponent(out.bookingId)}?pending=${
            syncPending ? '1' : '0'
          }&source=${encodeURIComponent(source)}`;
          return;
        }

        setMessage(
          out?.message ||
            'Could not confirm booking. Seats will remain held until the timer ends or you release them.'
        );
      } else {
        window.location.href = '/book';
      }
    } catch {
      setMessage(
        kind === 'success'
          ? 'Could not confirm booking right now.'
          : 'Could not release seats right now.'
      );
    } finally {
      setWorking(false);
    }
  };

  const pricing = data?.hold?.pricing;
  const seats = data?.hold?.seats || [];
  const seatCount = seats.length;

  return (
    <main className="mx-auto max-w-7xl px-4 py-5 md:px-6 md:py-8">
      <div className="grid gap-5 lg:grid-cols-[1.25fr_0.9fr]">
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.25)] backdrop-blur md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300/90">
                Payment confirmation
              </div>
              <h1 className="mt-2 text-2xl font-semibold text-white md:text-3xl">
                Complete booking within {seconds}s
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Seats are temporarily locked for this customer. Review the details, select the
                payment mode, and issue the ticket.
              </p>
            </div>

            <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-right">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-200/80">
                Time left
              </div>
              <div className="mt-1 text-2xl font-bold text-amber-100">{seconds}s</div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Film
              </div>
              <div className="mt-2 text-lg font-semibold text-white">
                {data?.show?.movieTitle || 'Loading...'}
              </div>
              <div className="mt-1 text-sm text-slate-400">
                {data?.show?.theatreName || 'Theatre details loading'}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Show timing
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-200">
                  {data?.show?.dayLabel || 'Day'}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white">
                  {data?.show?.dateLabel || 'Date'}
                </span>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${badgeTone(
                    data?.show?.slot
                  )}`}
                >
                  {data?.show?.slot || 'Show slot'}
                </span>
              </div>
              <div className="mt-3 text-xl font-bold text-white">
                {data?.show?.timeLabel || 'Time loading'}
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-3xl border border-cyan-400/15 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 p-5">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300/80">
                  Tickets
                </div>
                <div className="mt-2 text-3xl font-bold text-white">{seatCount}</div>
              </div>

              <div className="md:col-span-2">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300/80">
                  Selected seats
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {seats.length ? (
                    seats.map((seat) => (
                      <span
                        key={seat}
                        className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-bold text-white"
                      >
                        {seat}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-300">No seats loaded yet</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Payment mode
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label
                className={`cursor-pointer rounded-2xl border px-4 py-4 transition ${
                  paymentMode === 'DIGITAL'
                    ? 'border-cyan-400/35 bg-cyan-500/10 text-cyan-100'
                    : 'border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.06]'
                }`}
              >
                <input
                  type="radio"
                  className="hidden"
                  checked={paymentMode === 'DIGITAL'}
                  onChange={() => setPaymentMode('DIGITAL')}
                />
                <div className="text-base font-semibold">Digital Payment</div>
                <div className="mt-1 text-sm opacity-80">
                  UPI, card, wallet, or other electronic modes
                </div>
              </label>

              <label
                className={`cursor-pointer rounded-2xl border px-4 py-4 transition ${
                  paymentMode === 'CASH'
                    ? 'border-emerald-400/35 bg-emerald-500/10 text-emerald-100'
                    : 'border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.06]'
                }`}
              >
                <input
                  type="radio"
                  className="hidden"
                  checked={paymentMode === 'CASH'}
                  onChange={() => setPaymentMode('CASH')}
                />
                <div className="text-base font-semibold">Cash Payment</div>
                <div className="mt-1 text-sm opacity-80">
                  Collect cash at counter and issue printed ticket
                </div>
              </label>
            </div>
          </div>

          <div className="mt-5 min-h-[24px] text-sm text-amber-300">{message || '\u00A0'}</div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              className="rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={working}
              onClick={() => act('success')}
            >
              {working ? 'Processing...' : 'Payment received, issue ticket'}
            </button>

            <button
              className="rounded-2xl border border-red-400/25 bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-100 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={working}
              onClick={() => act('fail')}
            >
              Payment failed, release seats
            </button>
          </div>
        </section>

        <aside className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.25)] backdrop-blur md:p-7">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Amount summary
          </div>

          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>Net Amount</span>
              <strong className="text-white">{money(pricing?.net || 0)}</strong>
            </div>

            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>GST</span>
              <strong className="text-white">{money(pricing?.gst || 0)}</strong>
            </div>

            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>Entertainment Tax</span>
              <strong className="text-white">{money(pricing?.entertainmentTax || 0)}</strong>
            </div>

            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>Cess</span>
              <strong className="text-white">{money(pricing?.cess || 0)}</strong>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/80">
              Total payable
            </div>
            <div className="mt-2 text-3xl font-bold text-emerald-100">
              {money(pricing?.total || 0)}
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">
            Review the ticket details once more before confirming payment. 
          </div>
        </aside>
      </div>
    </main>
  );
}