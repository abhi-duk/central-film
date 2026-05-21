import { getHoldDetails } from '@/lib/store';
import PaymentSuccessClient from './PaymentSuccessClient';

export default async function PayPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const query = (await searchParams) || {};
  const holdId = typeof query.holdId === 'string' ? query.holdId : '';
  const showId = typeof query.showId === 'string' ? query.showId : undefined;
  const hold = holdId ? await getHoldDetails(holdId, showId) : null;
  return <PaymentSuccessClient hold={hold} />;
}
