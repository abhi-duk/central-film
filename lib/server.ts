import type { Theatre, TheatreStatus } from './types';
import { readMysqlStore } from './store';

export async function getTheatres(): Promise<Theatre[]> {
  const store = (await readMysqlStore()) as any;
  if (Array.isArray(store.theatres)) return store.theatres as Theatre[];

  const firstShow = Array.isArray(store.shows) ? store.shows[0] : null;
  const status: TheatreStatus = store.theatreStatus ?? 'RECOVERING';
  return [
    {
      id: firstShow?.theatreId ?? 'THT_EMP',
      name: firstShow?.theatreName ?? 'EVM Palace Cinemas, Ernakulam',
      status,
      lastHeartbeatAt: store.heartbeatAt ?? null,
      allowCentralFallback: store.policy?.allowCentralFallback ?? true,
      pendingSync: Number(store.syncCounts?.pending ?? 0),
      failedSync: Number(store.syncCounts?.failed ?? 0),
      conflicts: Number(store.syncCounts?.conflicts ?? 0),
    },
  ];
}

export async function getTheatre(theatreId: string): Promise<Theatre | null> {
  const theatres = await getTheatres();
  return theatres.find((theatre) => theatre.id === theatreId) ?? null;
}
