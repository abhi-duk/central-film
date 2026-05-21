import { NextRequest } from 'next/server';
import { GET as liveGet } from '../../../live/show/route';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest, { params }: { params: Promise<{ showId: string }> }) {
  const { showId } = await params;
  const url = new URL(req.url);
  url.searchParams.set('showId', showId);
  return liveGet(new NextRequest(url));
}
