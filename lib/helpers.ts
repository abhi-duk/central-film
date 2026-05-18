export function utcNowSql() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

export function formatLocal(dt?: string | null) {
  if (!dt) return '-';
  return new Date(dt + (dt.endsWith('Z') ? '' : 'Z')).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

export function posterFor(title: string) {
  const posters: Record<string, string> = {
    'L2: Empuraan': 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=1200&auto=format&fit=crop',
    'Officer on Duty': 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=1200&auto=format&fit=crop',
    'Marco': 'https://picsum.photos/seed/marco/800/1200',
  };
  return posters[title] || `https://picsum.photos/seed/${encodeURIComponent(title)}/800/1200`;
}

export function seatSort(a: string, b: string) {
  const ra = a[0], rb = b[0];
  if (ra !== rb) return ra.localeCompare(rb);
  return Number(a.slice(1)) - Number(b.slice(1));
}
