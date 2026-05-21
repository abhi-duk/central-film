import { decodeHoldPayload, getHoldDetails } from '@/lib/store';
import PaymentSuccessClient from './PaymentSuccessClient';

export default async function PayPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const query = (await searchParams) || {};
  const holdId = typeof query.holdId === 'string' ? query.holdId : '';
  const showId = typeof query.showId === 'string' ? query.showId : undefined;
  const holdToken = typeof query.holdToken === 'string' ? query.holdToken : '';
  const savedHold = holdId ? await getHoldDetails(holdId, showId) : null;
  const tokenHold = decodeHoldPayload(holdToken);
  const hold = savedHold || (tokenHold && (!holdId || tokenHold.holdId === holdId) ? tokenHold : null);
  return <PaymentSuccessClient hold={hold} holdToken={holdToken} />;
}
