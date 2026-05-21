export const dynamic = 'force-dynamic';

import PageShell from '@/components/PageShell';
import { ensureCentralSchema, readMysqlStore } from '@/lib/store';

export default async function PoliciesPage() {
  await ensureCentralSchema();
  const store = await readMysqlStore();
  const policy = store.policy;
  return (
    <PageShell title="Policies & timing" subtitle="Central controls for hold duration, gateway grace time and theatre heartbeat timeout.">
      <section className="grid grid-4">
        <div className="card"><div className="eyebrow">Seat Hold</div><div className="stat-value">{policy.holdMinutes}m</div><p>Reserved before payment expiry.</p></div>
        <div className="card"><div className="eyebrow">Payment Grace</div><div className="stat-value">{policy.paymentGraceSeconds}s</div><p>Gateway callback safety window.</p></div>
        <div className="card"><div className="eyebrow">Heartbeat Timeout</div><div className="stat-value">{policy.heartbeatTimeoutSeconds}s</div><p>Marks theatre node unhealthy.</p></div>
        <div className="card"><div className="eyebrow">Fallback</div><div className="stat-value">{policy.allowCentralFallback ? 'ON' : 'OFF'}</div><p>Allow central booking if local is unavailable.</p></div>
      </section>
      <section className="card" style={{ marginTop: 18 }}>
        <h3>API update sample</h3>
        <pre style={{ whiteSpace: 'pre-wrap', color: 'var(--muted)' }}>{`POST /api/policies
{
  "holdMinutes": 8,
  "paymentGraceSeconds": 90,
  "heartbeatTimeoutSeconds": 120,
  "allowCentralFallback": false
}`}</pre>
      </section>
    </PageShell>
  );
}
