'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

type Show = {
  showId: string;
  movieTitle: string;
  theatreName: string;
  timeIso: string;
  dayLabel?: string;
  slot?: string;
  dateLabel?: string;
  timeLabel?: string;
  pricing?: any;
};

type SeatMap = Record<
  string,
  { status: 'AVAILABLE' | 'HELD' | 'BOOKED'; holdExpiresAt?: string | null }
>;

type SeatClasses = Record<string, 'PREMIUM' | 'EXECUTIVE' | 'ECONOMY'>;

type Pricing = {
  premiumRate: number;
  executiveRate: number;
  economyRate: number;
  gstPct: number;
  entertainmentTaxPct: number;
  cessPct: number;
};

function stableSeatMapSignature(map: SeatMap) {
  return JSON.stringify(
    Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([seat, value]) => [seat, value.status, value.holdExpiresAt || null])
  );
}

function money(n: number) {
  return `₹${Number(n || 0).toFixed(2)}`;
}

function computePricing(selected: string[], seatClasses: SeatClasses, pricing?: Pricing | null) {
  if (!pricing) return { net: 0, gst: 0, entertainmentTax: 0, cess: 0, total: 0 };

  const net = selected.reduce((sum, seat) => {
    const seatClass = seatClasses[seat];
    const rate =
      seatClass === 'PREMIUM'
        ? pricing.premiumRate
        : seatClass === 'EXECUTIVE'
        ? pricing.executiveRate
        : pricing.economyRate;

    return sum + rate;
  }, 0);

  const gst = +(net * pricing.gstPct / 100).toFixed(2);
  const entertainmentTax = +(net * pricing.entertainmentTaxPct / 100).toFixed(2);
  const cess = +(net * pricing.cessPct / 100).toFixed(2);
  const total = +(net + gst + entertainmentTax + cess).toFixed(2);

  return { net, gst, entertainmentTax, cess, total };
}

export default function BookingChooser({
  theatreId,
  initialShows,
}: {
  theatreId: string;
  initialShows: Show[];
}) {
  const [selectedShow, setSelectedShow] = useState<Show | null>(initialShows[0] ?? null);
  const [seatMap, setSeatMap] = useState<SeatMap>({});
  const [seatClasses, setSeatClasses] = useState<SeatClasses>({});
  const [pricing, setPricing] = useState<Pricing | null>(initialShows[0]?.pricing || null);
  const [selected, setSelected] = useState<string[]>([]);
  const [authority, setAuthority] = useState<'LOCAL' | 'ONLINE' | 'BLOCKED'>('BLOCKED');
  const [heartbeatHealthy, setHeartbeatHealthy] = useState(false);
  const [canBookOnline, setCanBookOnline] = useState(false);
  const [message, setMessage] = useState('');
  const [showOfflineState, setShowOfflineState] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionError, setActionError] = useState('');
  const [holding, setHolding] = useState(false);

  const firstLoadRef = useRef(true);
  const seatSigRef = useRef('');
  const versionRef = useRef<number>(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loadingRef = useRef(false);

  const rows = useMemo(
    () => Array.from(new Set(Object.keys(seatMap || {}).map((seat) => seat[0]))),
    [seatMap]
  );

  const amounts = useMemo(
    () => computePricing(selected, seatClasses, pricing),
    [selected, seatClasses, pricing]
  );

  const toggleSeat = (seat: string) => {
    const status = seatMap[seat]?.status;
    if (status === 'BOOKED' || status === 'HELD' || holding) return;

    setSelected((prev) =>
      prev.includes(seat) ? prev.filter((x) => x !== seat) : [...prev, seat]
    );
  };

  async function loadSeats(soft = false) {
    if (!selectedShow?.showId) return;
    if (loadingRef.current) return;

    loadingRef.current = true;

    try {
      if (firstLoadRef.current) setLoading(true);
      else if (soft) setRefreshing(true);

      const qs = new URLSearchParams({
        showId: selectedShow.showId,
      });

      if (versionRef.current) {
        qs.set('ifVersion', String(versionRef.current));
      }

      const res = await fetch(`/api/live/show?${qs.toString()}`, {
        cache: 'no-store',
      });

      const text = await res.text();
      let data: any = null;

      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }

      if (!res.ok || !data || !data.success) {
        setMessage('The theatre server could not be checked right now.');
        setCanBookOnline(false);
        setShowOfflineState(true);
        return;
      }

      if (data.versionNo) {
        versionRef.current = Number(data.versionNo);
      }

      if (data.changed === false) {
        setAuthority(data.authority || 'BLOCKED');
        setHeartbeatHealthy(!!data.heartbeatHealthy);
        setCanBookOnline(!!data.canBookOnline);
        setMessage(data.message || '');
        setShowOfflineState(!data.canBookOnline);
        return;
      }

      const nextSeatMap: SeatMap = data.seatMap ?? {};
      const nextSig = stableSeatMapSignature(nextSeatMap);

      if (seatSigRef.current !== nextSig) {
        seatSigRef.current = nextSig;
        setSeatMap(nextSeatMap);

        setSelected((prev) =>
          prev.filter((seat) => nextSeatMap[seat]?.status === 'AVAILABLE')
        );
      }

      setSeatClasses(data.seatClasses || {});
      setPricing(data.pricing || null);

      if (data.show) {
        setSelectedShow((prev) =>
          prev
            ? {
                ...prev,
                ...data.show,
                timeIso: data.show.time || data.show.timeIso || prev.timeIso,
              }
            : prev
        );
      }

      setAuthority(data.authority || 'BLOCKED');
      setHeartbeatHealthy(!!data.heartbeatHealthy);
      setCanBookOnline(!!data.canBookOnline);
      setMessage(data.message || '');
      setShowOfflineState(!data.canBookOnline);
    } catch {
      setMessage('The theatre connection could not be checked right now.');
      setCanBookOnline(false);
      setShowOfflineState(true);
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setRefreshing(false);
      firstLoadRef.current = false;
    }
  }

  useEffect(() => {
    if (!selectedShow?.showId) return;

    firstLoadRef.current = true;
    seatSigRef.current = '';
    versionRef.current = 0;

    setSeatMap({});
    setSeatClasses({});
    setSelected([]);
    setLoading(true);
    setRefreshing(false);
    setActionError('');

    loadSeats(false);

    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    pollingRef.current = setInterval(() => {
      loadSeats(true);
    }, 5000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [selectedShow?.showId]);

  const startHold = async () => {
    if (!selectedShow || selected.length === 0 || holding) return;

    setHolding(true);
    setActionError('');

    try {
      const res = await fetch('/api/bookings/hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theatreId,
          showId: selectedShow.showId,
          movieTitle: selectedShow.movieTitle,
          theatreName: selectedShow.theatreName,
          showTimeIso: selectedShow.timeIso,
          showLabel: selectedShow.slot,
          seatIds: selected,
          pricing,
          seatClasses,
        }),
      });

      const text = await res.text();
      let data: any = null;

      try {
        data = text ? JSON.parse(text) : null;
      } catch {}

      if (data?.success) {
        window.location.href = `/book/pay?holdId=${encodeURIComponent(data.holdId)}`;
      } else {
        setActionError(data?.message || 'Could not hold seats');
      }
    } catch {
      setActionError('Could not hold seats right now. Please try again.');
    } finally {
      setHolding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="hero-card">
        <div>
          <div className="eyebrow">Online Booking</div>
          <h1 className="page-title">Choose show and seats</h1>
          <p className="page-subtitle">
            Fast, theatre-aware booking with live seat checks and clean payment flow.
          </p>
        </div>
        <div className="kicker">
          {heartbeatHealthy ? 'LIVE THEATRE' : authority === 'ONLINE' ? 'CENTRAL FALLBACK' : 'PAUSED'}
        </div>
      </div>

      <div className="show-grid">
        {initialShows.map((show) => (
          <button
            key={show.showId}
            type="button"
            onClick={() => setSelectedShow(show)}
            className={`show-card text-left ${
              selectedShow?.showId === show.showId ? 'ring-2 ring-[var(--accent)]' : ''
            }`}
          >
            <div
              className="poster"
              style={{
                backgroundImage: `linear-gradient(180deg, transparent, rgba(0,0,0,.45)), url(${
                  show.showId === 'SHOW_EMP_001'
                    ? 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=900&auto=format&fit=crop'
                    : 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=900&auto=format&fit=crop'
                })`,
              }}
            />
            <div className="mt-4 text-2xl font-black">{show.movieTitle}</div>
            <div className="mt-1 text-[var(--muted)]">{show.theatreName}</div>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <span className="seat-pill">{show.dayLabel || ''}</span>
              <span className="seat-pill">{show.slot || ''}</span>
              <span className="seat-pill">
                {show.timeLabel ||
                  new Date(show.timeIso).toLocaleTimeString('en-IN', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                    timeZone: 'Asia/Kolkata',
                  })}
              </span>
            </div>
          </button>
        ))}
      </div>

      <div className="seat-page">
        <div className="seat-panel">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-2xl font-black">{selectedShow?.movieTitle}</div>
              <div className="mt-2 flex flex-wrap gap-2 text-sm">
                <span className="seat-pill">{selectedShow?.dayLabel}</span>
                <span className="seat-pill">{selectedShow?.dateLabel}</span>
                <span className="seat-pill">{selectedShow?.timeLabel}</span>
                <span className="seat-pill">{selectedShow?.slot}</span>
              </div>
            </div>
            <div className="seat-pill">
              {refreshing ? 'Refreshing seat status...' : 'Live status stable'}
            </div>
          </div>

          {message ? (
            <div className="mt-4 rounded-xl bg-black/20 px-4 py-3 text-sm">{message}</div>
          ) : null}

          {showOfflineState ? (
            <div className="mt-6 compact-card p-6">
              <div className="text-xl font-bold">This theatre is offline right now</div>
              <div className="mini-note mt-2">
                Please choose another theatre later or wait for connection recovery.
              </div>
              <Link href="/" className="btn btn-secondary mt-4 inline-flex">
                Back to dashboard
              </Link>
            </div>
          ) : loading ? (
            <div className="mt-6">Loading seat layout...</div>
          ) : (
            <>
              <div className="mx-auto mt-6 mb-5 max-w-3xl rounded-full bg-black/25 py-3 text-center text-sm tracking-[0.3em] text-slate-200">
                SCREEN
              </div>

              <div className="seat-grid-wrap">
                <div className="seat-grid">
                  {rows.map((row) => (
                    <React.Fragment key={row}>
                      {row === 'A' && (
                        <div className="zone-row">
                          Premium Circle • ₹{pricing?.premiumRate ?? 0} / seat
                        </div>
                      )}
                      {row === 'D' && (
                        <div className="zone-row">
                          Executive Circle • ₹{pricing?.executiveRate ?? 0} / seat
                        </div>
                      )}
                      {row === 'G' && (
                        <div className="zone-row">
                          Economy Circle • ₹{pricing?.economyRate ?? 0} / seat
                        </div>
                      )}

                      <div className="flex items-center justify-center font-bold text-[var(--muted)]">
                        {row}
                      </div>

                      {Array.from({ length: 8 }).map((_, i) => {
                        const seat = `${row}${i + 1}`;
                        const status = seatMap[seat]?.status || 'AVAILABLE';
                        const cls = selected.includes(seat)
                          ? 'seat seat-selected'
                          : status === 'BOOKED'
                          ? 'seat seat-booked'
                          : status === 'HELD'
                          ? 'seat seat-held'
                          : 'seat seat-available';

                        return (
                          <button
                            key={seat}
                            type="button"
                            className={cls}
                            onClick={() => toggleSeat(seat)}
                          >
                            {i + 1}
                          </button>
                        );
                      })}

                      <div />

                      {Array.from({ length: 8 }).map((_, i) => {
                        const seat = `${row}${i + 9}`;
                        const status = seatMap[seat]?.status || 'AVAILABLE';
                        const cls = selected.includes(seat)
                          ? 'seat seat-selected'
                          : status === 'BOOKED'
                          ? 'seat seat-booked'
                          : status === 'HELD'
                          ? 'seat seat-held'
                          : 'seat seat-available';

                        return (
                          <button
                            key={seat}
                            type="button"
                            className={cls}
                            onClick={() => toggleSeat(seat)}
                          >
                            {i + 9}
                          </button>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <aside className="seat-panel">
          <div className="eyebrow">Selection summary</div>
          <div className="stat-value">{selected.length}</div>
          <div className="mini-note">Seat(s) selected</div>
          <div className="mt-4 font-semibold">
            {selected.length ? selected.join(', ') : 'Choose seats to continue'}
          </div>

          <div className="mt-6 space-y-2 text-sm">
            <div className="summary-line">
              <span>Net amount</span>
              <strong>{money(amounts.net)}</strong>
            </div>
            <div className="summary-line">
              <span>GST</span>
              <strong>{money(amounts.gst)}</strong>
            </div>
            <div className="summary-line">
              <span>Entertainment Tax</span>
              <strong>{money(amounts.entertainmentTax)}</strong>
            </div>
            <div className="summary-line">
              <span>Cess</span>
              <strong>{money(amounts.cess)}</strong>
            </div>
          </div>

          <div className="summary-total mt-4">
            <span>Total Amount</span>
            <span>{money(amounts.total)}</span>
          </div>

          <div className="mt-4 min-h-[24px] text-sm text-red-300">{actionError || '\u00A0'}</div>

          <button
            type="button"
            className={`btn mt-2 w-full ${
              selected.length && !holding ? 'btn-primary' : 'btn-secondary cursor-not-allowed opacity-60'
            }`}
            disabled={!selected.length || holding || showOfflineState}
            onClick={startHold}
          >
            {holding ? 'Holding seats...' : 'Hold seats and continue'}
          </button>
        </aside>
      </div>
    </div>
  );
}
