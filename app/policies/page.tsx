import { PageShell } from '../../components/PageShell';
import { readStore } from '../../lib/store';
import { PolicyForm } from './policy-form';

export const dynamic = 'force-dynamic';

export default async function PoliciesPage() {
  const theatre = (await readStore()).theatres[0];
  return (
    <PageShell
      title="Policy Configuration"
      subtitle="This is the steering wheel for heartbeat-loss behavior. Set working hours, outage mode, lead-time cutoff, and the local public URL."
    >
      <PolicyForm theatre={theatre} />
    </PageShell>
  );
}
