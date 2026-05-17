'use client';

import { useEffect, useRef, useState } from 'react';

type Status = {
  healthy: boolean;
  authority: 'LOCAL' | 'ONLINE' | 'BLOCKED';
};

function speak(text: string, times = 2) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  for (let i = 0; i < times; i++) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }
}

function announcementFor(status: Status) {
  if (status.healthy) {
    return 'Internet connection is back. Online booking is active. Theatre live booking is active.';
  }
  if (status.authority === 'ONLINE') {
    return 'Internet connection is lost. Central online booking is active. Local counter booking should pause.';
  }
  if (status.authority === 'LOCAL') {
    return 'Internet connection is lost. Online booking is paused. Local counter booking is active.';
  }
  return 'Internet connection is lost. Booking is paused.';
}

export function ConnectionBanner({ theatreId }: { theatreId: string }) {
  const [status, setStatus] = useState<Status | null>(null);
  const previousSignature = useRef<string | null>(null);
  const pendingSignature = useRef<string | null>(null);
  const pendingCount = useRef(0);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/theatres/${theatreId}/authority`, { cache: 'no-store' });
        const data = await res.json();
        if (!data?.success) return;
        const next: Status = {
          healthy: !!data.heartbeatHealthy,
          authority: data.authority,
        };
        const signature = `${next.healthy}-${next.authority}`;
        if (previousSignature.current === null) {
          previousSignature.current = signature;
          setStatus(next);
          return;
        }
        if (previousSignature.current === signature) {
          pendingSignature.current = null;
          pendingCount.current = 0;
          setStatus(next);
          return;
        }
        if (pendingSignature.current !== signature) {
          pendingSignature.current = signature;
          pendingCount.current = 1;
          return;
        }
        pendingCount.current += 1;
        if (pendingCount.current >= 2) {
          previousSignature.current = signature;
          pendingSignature.current = null;
          pendingCount.current = 0;
          setStatus(next);
          speak(announcementFor(next), 2);
        }
      } catch {}
    };

    load();
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, [theatreId]);

  if (!status) return null;

  const isLost = !status.healthy;
  const tone = isLost ? 'banner-red' : 'banner-green';
  const title = isLost ? 'Internet connection is lost at the theatre' : 'Internet connection is healthy';
  const subtitle = isLost
    ? status.authority === 'ONLINE'
      ? 'Central online booking is active now. Local counters should wait until the connection comes back.'
      : status.authority === 'LOCAL'
      ? 'Online booking is paused now. Only local counter booking is active.'
      : 'Both online and local booking are paused until the connection comes back.'
    : 'Online booking is active and the theatre server is confirming seats in the background.';

  return (
    <div className={`status-banner ${tone}`}>
      <div>
        <div className="status-title">{title}</div>
        <div className="status-subtitle">{subtitle}</div>
      </div>
      <div className="status-pill">{status.healthy ? 'Online booking active' : status.authority === 'LOCAL' ? 'Local counter active' : status.authority === 'ONLINE' ? 'Central online active' : 'Booking paused'}</div>
    </div>
  );
}
