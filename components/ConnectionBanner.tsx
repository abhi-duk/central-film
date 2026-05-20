'use client';

import { useEffect, useRef, useState } from 'react';

type Status = { healthy: boolean; authority: 'LOCAL' | 'ONLINE' | 'BLOCKED'; recoveryState?: 'LIVE'|'RECOVERING'|'OFFLINE'; syncPendingCount?: number; };

function beep() {
  if (typeof window === 'undefined' || !window.AudioContext) return;
  try {
    const ctx = new window.AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine'; osc.frequency.value = 880; gain.gain.value = 0.05;
    osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.12);
  } catch {}
}

function speak(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v => /female|zira|samantha|google uk english female|heera/i.test(v.name));
  if (preferred) utterance.voice = preferred;
  utterance.pitch = 1.05; utterance.rate = 1;
  window.speechSynthesis.speak(utterance);
}

function shortLabel(s: Status) {
  if (s.recoveryState === 'RECOVERING') return 'RECOVERING';
  if (s.healthy) return 'LIVE';
  return 'NO NET';
}
function tone(s: Status) { return s.healthy && s.recoveryState !== 'RECOVERING' ? 'ok' : s.recoveryState === 'RECOVERING' ? 'warn' : 'bad'; }
function message(s: Status) {
  if (s.recoveryState === 'RECOVERING') return `Theatre link restored. Sync pending: ${s.syncPendingCount || 0}. Online resumes after reconciliation.`;
  if (s.healthy) return 'Live confirmation with theatre server is active.';
  if (s.authority === 'ONLINE') return 'Central online booking is active. Counter waits.';
  if (s.authority === 'LOCAL') return 'Online paused. Counter booking continues.';
  return 'Booking paused until the connection returns.';
}

export default function ConnectionBanner({ theatreId }: { theatreId: string }) {
  const [status, setStatus] = useState<Status | null>(null);
  const candidate = useRef<string | null>(null);
  const count = useRef(0);

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        const res = await fetch(`/api/theatres/${theatreId}/authority`, { cache: 'no-store' });
        const text = await res.text();
        let data: any = null; try { data = text ? JSON.parse(text) : null; } catch {}
        if (!active || !data?.success) return;
        const next: Status = { healthy: !!data.heartbeatHealthy, authority: data.authority, recoveryState: data.theatre?.recoveryState, syncPendingCount: data.theatre?.syncPendingCount };
        const sig = JSON.stringify(next);
        if (candidate.current === sig) count.current += 1; else { candidate.current = sig; count.current = 1; }
        if (count.current < 3) return;
        setStatus(prev => {
          if (prev && JSON.stringify(prev) !== sig) { beep(); speak(message(next)); }
          return next;
        });
      } catch {}
    };
    run(); const t = setInterval(run, 5000); return () => { active = false; clearInterval(t); };
  }, [theatreId]);

  if (!status) return <div className="status-card status-warn"><div className="status-led blink" /><div><div className="status-title-sm">CHECKING</div><div className="status-copy">Checking theatre link…</div></div></div>;
  return (
    <div className={`status-card status-${tone(status)}`}>
      <div className={`status-led ${tone(status)==='bad'?'blink':''}`} />
      <div className="min-w-0">
        <div className="status-title-sm">{shortLabel(status)}</div>
        <div className="status-copy">{message(status)}</div>
      </div>
    </div>
  );
}
