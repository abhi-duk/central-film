
import type { Theatre } from './authority';
import { readMysqlStore } from './store';

export async function getTheatres(): Promise<Theatre[]> {
  const store = await readMysqlStore();
  return store.theatres.map(t => ({
    ...t,
    updatedAt: (t as any).updatedAt || new Date().toISOString(),
  }));
}
