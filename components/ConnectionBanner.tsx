'use client';

import { useEffect, useRef, useState } from 'react';

type Status = { healthy: boolean; authority: 'LOCAL' | 'ONLINE' | 'BLOCKED' };

function speak(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  window.speechSynthesis.speak(utterance);
}

function message(s: Status) {
  if (s.healthy) return 'Internet connection is healthy. Online booking is active and the theatre server is confirming seats in the background.';
  if (s.authority === 'ONLINE') return 'Internet connection is lost at the theatre. Central online booking is active now. Local counters should wait until the connection comes back.';
  if (s.authority === 'LOCAL') return 'Internet connection is lost at the theatre. Online booking is paused now. Only local counter booking is active.';
  return 'Internet connection is lost. Booking is paused until the connection comes back.';
}

export default function ConnectionBanner({ theatreId }: { theatreId: string }) {
  const [status, setStatus] = useState<Status | null>(null);
  const candidateSignature = useRef<string | null>(null);
  const candidateCount = useRef(0);

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        const res = await fetch(`/api/theatres/${theatreId}/authority`, { cache: 'no-store' });
        const text = await res.text();
        let data: any = null;
        try { data = text ? JSON.parse(text) : null; } catch {}
        if (!active || !data?.success) return;
        const next: Status = { healthy: !!data.heartbeatHealthy, authority: data.authority };
        const signature = `${next.healthy}-${next.authority}`;
        if (candidateSignature.current === signature) candidateCount.current += 1;
        else { candidateSignature.current = signature; candidateCount.current = 1; }
        if (candidateCount.current < 3) return;
        setStatus(prev => {
          const prevSignature = prev ? `${prev.healthy}-${prev.authority}` : null;
          if (prevSignature && prevSignature !== signature) speak(message(next));
          return next;
        });
      } catch {}
    };
    run();
    const timer = setInterval(run, 5000);
    return () => { active = false; clearInterval(timer); };
  }, [theatreId]);

  if (!status) return null;
  const cls = status.healthy ? 'banner banner-ok' : status.authority === 'BLOCKED' ? 'banner banner-bad' : 'banner banner-warn';
  return (
    <div className={cls}>
      <div>
        <div className="font-bold">CENTRAL ONLINE SERVER</div>
        <div className="text-sm opacity-90">{message(status)}</div>
      </div>
      <div className="rounded-full bg-black/20 px-3 py-1 text-xs font-semibold">
        {status.healthy ? 'Live via theatre' : status.authority === 'ONLINE' ? 'Central fallback active' : status.authority === 'LOCAL' ? 'Local counter only' : 'Booking paused'}
      </div>
    </div>
  );
}
