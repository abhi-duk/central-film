"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type Theatre = { theatreId: string; name: string; localPublicUrl: string };
type ShowItem = { showId: string; movieId: string; movieTitle: string; time: string; theatreName?: string };
type SeatMap = Record<string, { status: 'AVAILABLE' | 'HELD' | 'BOOKED' }>;

const movieCards = {
  empuraan: {
    title: 'L2: Empuraan',
    blurb: 'Grand action spectacle. Seats move quickly once evening booking opens.',
    image: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1200&q=80',
  },
  officer: {
    title: 'Officer on Duty',
    blurb: 'Sharper thriller mood with a cleaner late-show rush and smaller family groups.',
    image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80',
  },
} as const;

function HallRow({ row, seatMap, selectedSeats, onToggle, disabled }: { row: string; seatMap: SeatMap; selectedSeats: string[]; onToggle: (seatId: string) => void; disabled: boolean }) {
  const rowSeats = Object.keys(seatMap).filter((seat) => seat.startsWith(row));
  const left = rowSeats.slice(0, 4);
  const right = rowSeats.slice(4);
  const renderSeat = (seatId: string) => {
    const state = seatMap[seatId]?.status;
    const cls = selectedSeats.includes(seatId) ? 'seat selected' : state === 'BOOKED' ? 'seat booked' : state === 'HELD' ? 'seat held' : 'seat free';
    return <button key={seatId} type="button" className={cls} onClick={() => onToggle(seatId)} disabled={disabled && !selectedSeats.includes(seatId)}>{seatId}</button>;
  };
  return (
    <div className="row-wrap">
      <div className="row-label">{row}</div>
      <div className="row-seats">
        <div className="seat-block">{left.map(renderSeat)}</div>
        <div className="aisle-gap" />
        <div className="seat-block">{right.map(renderSeat)}</div>
      </div>
    </div>
  );
}

export function BookingChooser({ theatre, shows }: { theatre: Theatre; shows: ShowItem[] }) {
  const router = useRouter();
  const search = useSearchParams();
  const initialMovie = search.get('movie') || shows[0]?.movieId || '';
  const [movieId, setMovieId] = useState(initialMovie);
  const [showId, setShowId] = useState(shows.find((s) => s.movieId === initialMovie)?.showId || shows[0]?.showId || '');
  const [seatMap, setSeatMap] = useState<SeatMap>({});
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [authority, setAuthority] = useState<'LOCAL' | 'ONLINE' | 'BLOCKED'>('LOCAL');
  const [heartbeatHealthy, setHeartbeatHealthy] = useState(true);
  const [canBookOnline, setCanBookOnline] = useState(true);
  const [showOfflineState, setShowOfflineState] = useState(false);
  const [loading, setLoading] = useState(false);

  const filteredShows = useMemo(() => shows.filter((s) => s.movieId === movieId), [shows, movieId]);
  const selectedShow = useMemo(() => filteredShows.find((s) => s.showId === showId) || filteredShows[0], [filteredShows, showId]);

  useEffect(() => {
    if (!filteredShows.some((s) => s.showId === showId)) setShowId(filteredShows[0]?.showId || '');
  }, [filteredShows, showId]);

  useEffect(() => {
    const load = async () => {
      if (!selectedShow) return;
      const res = await fetch(`/api/live/show?showId=${selectedShow.showId}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setSeatMap(data.seatMap || {});
        setAuthority(data.authority);
        setHeartbeatHealthy(!!data.heartbeatHealthy);
        setCanBookOnline(!!data.canBookOnline);
        if (data.message) setMessage(data.message);
        else setMessage('');
        setShowOfflineState(!data.heartbeatHealthy && data.authority !== 'ONLINE');
      }
    };
    load();
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, [selectedShow?.showId]);

  const toggleSeat = (seatId: string) => {
    if (!canBookOnline) return;
    if (selectedSeats.includes(seatId)) {
      setSelectedSeats((prev) => prev.filter((s) => s !== seatId));
      return;
    }
    const state = seatMap[seatId]?.status;
    if (state && state !== 'AVAILABLE') return;
    setSelectedSeats((prev) => [...prev, seatId]);
  };

  const proceed = async () => {
    if (!selectedShow) return;
    if (!selectedSeats.length) {
      setMessage('Please choose one or more seats first.');
      return;
    }
    if (!canBookOnline) {
      setMessage(!heartbeatHealthy && authority === 'LOCAL'
        ? 'Internet connection is lost at the theatre. This theatre is offline for online booking right now.'
        : 'Internet connection is lost and booking is paused for the moment.');
      setShowOfflineState(true);
      return;
    }
    const staleSeat = selectedSeats.find((seatId) => seatMap[seatId]?.status !== 'AVAILABLE');
    if (staleSeat) {
      setMessage(`${staleSeat} is no longer free. Please remove it and continue.`);
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/live/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showId: selectedShow.showId, seatIds: selectedSeats, customerIp: '' }),
      });
      const data = await res.json();
      if (!data.success) {
        setMessage(data.message || 'Booking could not be completed.');
        return;
      }
      setSelectedSeats([]);
      router.push(`/ticket/${data.booking.bookingId}`);
    } finally {
      setLoading(false);
    }
  };

  const rows = Array.from(new Set(Object.keys(seatMap).map((seat) => seat[0])));
  const laymanMessage = heartbeatHealthy && authority === 'LOCAL'
    ? 'The theatre server is connected. Your seats will be checked there quietly in the background before the ticket is issued.'
    : !heartbeatHealthy && authority === 'ONLINE'
      ? 'The theatre internet is down. Central online booking is handling new bookings now.'
      : !heartbeatHealthy && authority === 'LOCAL'
        ? 'The theatre internet is down. This theatre is offline for online booking right now.'
        : 'The theatre internet is down and booking is paused for the moment.';

  if (showOfflineState) {
    return (
      <div className="card">
        <div className="kicker">Theatre status</div>
        <h3 style={{ margin: '10px 0 8px 0', fontSize: 30 }}>This theatre is offline right now</h3>
        <p className="subtitle">Internet connection at the theatre is lost, so online booking cannot continue for this theatre at the moment. Please go back and choose another theatre or wait until the connection returns.</p>
        <div className="notice mt24">{message || 'Connection issue detected for this theatre.'}</div>
        <div className="print-actions no-print" style={{ justifyContent: 'flex-start' }}>
          <button type="button" className="button secondary" onClick={() => setShowOfflineState(false)}>View details again</button>
          <button type="button" className="button cyan" onClick={() => router.push('/')}>Back to theatre selection</button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-2">
      <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
        <div style={{ position: 'relative', minHeight: 320 }}>
          <img className="poster-image" src={movieCards[movieId as keyof typeof movieCards]?.image || movieCards.empuraan.image} alt={movieCards[movieId as keyof typeof movieCards]?.title || 'Movie'} />
          <div className="poster-content">
            <div className="movie-chip">{theatre.name}</div>
            <h3 className="poster-title">{movieCards[movieId as keyof typeof movieCards]?.title || 'Choose a movie'}</h3>
            <p className="poster-copy">{movieCards[movieId as keyof typeof movieCards]?.blurb || 'Select a movie and show time to continue.'}</p>
          </div>
        </div>
        <div style={{ padding: 22 }}>
          <div className="label">Choose movie</div>
          <div className="poster-row">
            {Object.entries(movieCards).map(([id, meta]) => (
              <button key={id} type="button" className="card alt" style={{ textAlign: 'left', padding: 16, borderColor: id === movieId ? 'rgba(103,232,249,.5)' : undefined }} onClick={() => setMovieId(id)}>
                <div className="movie-chip">{id === movieId ? 'Selected now' : 'Tap to choose'}</div>
                <h3 style={{ margin: '14px 0 0 0', fontSize: 24 }}>{meta.title}</h3>
                <p className="subtitle" style={{ marginTop: 10 }}>{meta.blurb}</p>
              </button>
            ))}
          </div>
          <div className="mt24">
            <label className="label">Choose show time</label>
            <select className="select" value={selectedShow?.showId || ''} onChange={(e) => setShowId(e.target.value)}>
              {filteredShows.map((show) => (
                <option key={show.showId} value={show.showId}>{show.movieTitle} — {new Date(show.time).toLocaleString()}</option>
              ))}
            </select>
          </div>
          <div className="notice mt24">{laymanMessage}</div>
        </div>
      </div>

      <div className="card">
        <div className="flex-between" style={{ flexWrap: 'wrap' }}>
          <div>
            <div className="kicker">Seat selection</div>
            <h3 style={{ margin: '10px 0 4px 0', fontSize: 30 }}>{selectedShow?.movieTitle}</h3>
            <div className="small">{theatre.name} • {selectedShow ? new Date(selectedShow.time).toLocaleString() : ''}</div>
          </div>
          <div className={`badge ${heartbeatHealthy && authority === 'LOCAL' ? 'online' : authority === 'ONLINE' ? 'online-mode' : 'offline'}`}>
            {heartbeatHealthy && authority === 'LOCAL' ? 'Theatre confirms in background' : authority === 'ONLINE' ? 'Central fallback active' : authority === 'LOCAL' ? 'Only local counter active' : 'Booking paused'}
          </div>
        </div>

        <div className="hall-wrap mt24">
          <div className="hall-scroll">
          <div className="hall-legend">
            <div className="legend-chip"><span className="legend-dot" style={{ background: 'linear-gradient(135deg,#132033,#132033)' }} /> Free</div>
            <div className="legend-chip"><span className="legend-dot" style={{ background: 'linear-gradient(135deg,#67e8f9,#0ea5e9)' }} /> Your choice</div>
            <div className="legend-chip"><span className="legend-dot" style={{ background: 'linear-gradient(135deg,#fde68a,#f59e0b)' }} /> Being held</div>
            <div className="legend-chip"><span className="legend-dot" style={{ background: 'linear-gradient(135deg,#fca5a5,#ef4444)' }} /> Sold</div>
          </div>
          <div className="screen-arch">SCREEN</div>
          <div className="hall-inner">
            {rows.map((row) => <HallRow key={row} row={row} seatMap={seatMap} selectedSeats={selectedSeats} onToggle={toggleSeat} disabled={!canBookOnline} />)}
          </div>
          </div>
        </div>

        <div className="summary-bar">
          <div>
            <div className="small">Selected seats</div>
            <div className="ticket-seats">{selectedSeats.length ? selectedSeats.join(', ') : 'Nothing selected yet'}</div>
          </div>
          <div className="flex" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button type="button" className="button secondary" onClick={() => setSelectedSeats([])} disabled={!selectedSeats.length}>Clear seats</button>
            <button type="button" className="button cyan" onClick={proceed} disabled={loading || !selectedSeats.length || !canBookOnline}>{loading ? 'Confirming…' : 'Confirm booking'}</button>
          </div>
        </div>
        {message && <div className="notice mt24">{message}</div>}
      </div>
    </div>
  );
}
