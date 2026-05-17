import { PageShell } from '../../components/PageShell';
import { readStore } from '../../lib/store';
import { PendingActions } from './pending-actions';

export const dynamic = 'force-dynamic';

export default async function PendingPage() {
  const pending = (await readStore()).pending;
  return (
    <PageShell
      title="Pending Transactions"
      subtitle="This page is for those awkward half-bookings when a customer started a flow and the local node became uncertain before final confirmation."
    >
      <PendingActions pending={pending} />
    </PageShell>
  );
}
