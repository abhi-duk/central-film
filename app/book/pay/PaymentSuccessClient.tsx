'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { HoldRecord } from '@/lib/types';

export default function PaymentSuccessClient({ hold }: { hold: HoldRecord | null }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const confirmPayment = async () => {
    if (!hold?.holdId || !hold?.showId) {
      setError('holdId and showId are required. Please start again from seat selection.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/bookings/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holdId: hold.holdId, showId: hold.showId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setError(data?.message || 'Payment confirmation failed.');
        return;
      }
      setResult(data);
    } catch {
      setError('Payment confirmation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!hold) {
    return (
      <div className="hero-card">
        <div>
          <div className="eyebrow">Payment Simulation</div>
          <h1 className="page-title">Seat hold not found</h1>
          <p className="page-subtitle">The payment page needs a valid holdId. Go back and select seats again.</p>
          <Link href="/book" className="btn btn-primary" style={{ marginTop: 18 }}>Back to booking</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="hero-card">
        <div>
          <div className="eyebrow">Payment Simulation</div>
          <h1 className="page-title">Confirm payment success</h1>
          <p className="page-subtitle">The gateway handoff now carries both holdId and showId, and the API can also recover showId from the saved hold.</p>
        </div>
        <div className="kicker">{hold.status}</div>
      </section>

      <section className="grid grid-2">
        <div className="card">
          <h3>Hold details</h3>
          <div className="summary-line"><span>Hold ID</span><strong>{hold.holdId}</strong></div>
          <div className="summary-line"><span>Show ID</span><strong>{hold.showId}</strong></div>
          <div className="summary-line"><span>Movie</span><strong>{hold.movieTitle}</strong></div>
          <div className="summary-line"><span>Seats</span><strong>{hold.seats.join(', ')}</strong></div>
          <div className="summary-total"><span>Total</span><span>₹{hold.amount.toFixed(2)}</span></div>
        </div>
        <div className="card">
          <h3>Payment status</h3>
          {result?.booking ? (
            <>
              <p>Payment success recorded and booking confirmed.</p>
              <div className="compact-card" style={{ padding: 16, marginTop: 16 }}>
                <strong>Booking ID:</strong> {result.booking.bookingId}<br />
                <strong>Seats:</strong> {result.booking.seats.join(', ')}
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
                <Link href={`/ticket/${result.booking.bookingId}`} className="btn btn-primary">View ticket</Link>
                <Link href="/reports" className="btn btn-secondary">Reports</Link>
              </div>
            </>
          ) : (
            <>
              <p>Click after gateway callback success. This prevents the earlier missing <strong>holdId/showId</strong> error.</p>
              <button type="button" className="btn btn-primary" onClick={confirmPayment} disabled={loading} style={{ marginTop: 16 }}>
                {loading ? 'Confirming…' : 'Payment Success'}
              </button>
              {error ? <div style={{ color: 'var(--danger)', marginTop: 14 }}>{error}</div> : null}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
