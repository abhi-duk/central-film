import Link from 'next/link';
import { PageShell } from '../components/PageShell';
import { readStore } from '../lib/store';
import { determineAuthority, heartbeatHealthy } from '../lib/authority';

export const dynamic = 'force-dynamic';

const movies = [
  {
    id: 'empuraan',
    title: 'L2: Empuraan',
    language: 'Malayalam',
    duration: '2h 45m',
    summary: 'A premium action spectacle. Large screen, big crowd energy, and fast-moving seats.',
    image: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'officer',
    title: 'Officer on Duty',
    language: 'Malayalam',
    duration: '2h 20m',
    summary: 'A sharp thriller-style demo title with a calmer seat rush and late-show appeal.',
    image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80',
  },
];

export default async function HomePage() {
  const store = await readStore();
  const theatre = store.theatres[0];
  const authority = determineAuthority(theatre);
  const healthy = heartbeatHealthy(theatre);
  const totalTickets = store.bookings.reduce((sum, b) => sum + b.totalTickets, 0);

  return (
    <PageShell
      title="Book online while the theatre updates live in the background"
      subtitle="Customers stay here on the central system. The local theatre engine is checked silently in the background, and seat availability changes here as soon as counters or online users take seats."
    >
      <section className="hero">
        <div className="card hero-card">
          <div className="kicker">Theatre watch</div>
          <div className="flex-between mt24" style={{ flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 34 }}>{theatre.name}</h2>
              <p className="subtitle" style={{ maxWidth: 'unset' }}>{theatre.city}</p>
            </div>
            <div className={`badge ${healthy ? 'online' : 'offline'}`}>{healthy ? 'Internet is healthy' : 'Internet connection is lost'}</div>
          </div>
          <div className="grid grid-3 mt24">
            <div className="card alt">
              <div className="small">Seat control right now</div>
              <div className={`badge ${authority === 'LOCAL' ? 'local' : authority === 'ONLINE' ? 'online-mode' : 'blocked'}`} style={{ marginTop: 12 }}>
                {authority === 'LOCAL' ? 'Theatre server is confirming seats' : authority === 'ONLINE' ? 'Central fallback mode is active' : 'Booking is paused'}
              </div>
            </div>
            <div className="card alt"><div className="small">Total bookings</div><div className="stat">{store.bookings.length}</div></div>
            <div className="card alt"><div className="small">Total tickets sold</div><div className="stat">{totalTickets}</div></div>
          </div>
          <div className="notice-strong mt24">
            <strong>Simple explanation:</strong> You book here on the central page. The theatre machine is checked quietly in the background. If the connection drops, the top banner and voice alert will tell you in plain language what is happening.
          </div>
          <div className="flex mt24" style={{ flexWrap: 'wrap' }}>
            <Link className="button cyan" href="/book">Start online booking</Link>
            <Link className="button secondary" href="/policies">Internet-loss rules</Link>
            <Link className="button secondary" href="/reports">Reports and audit</Link>
          </div>
        </div>
        <div className="grid grid-2">
          <div className="card">
            <div className="small">Last heartbeat</div>
            <div className="stat" style={{ fontSize: 18 }}>{theatre.lastHeartbeatAt ? new Date(theatre.lastHeartbeatAt).toLocaleString() : 'Waiting for theatre signal'}</div>
          </div>
          <div className="card">
            <div className="small">Working-hours outage rule</div>
            <div className="stat" style={{ fontSize: 18 }}>{theatre.outageModeWorkingHours.replaceAll('_', ' ')}</div>
          </div>
          <div className="card">
            <div className="small">Off-hours outage rule</div>
            <div className="stat" style={{ fontSize: 18 }}>{theatre.outageModeOffHours.replaceAll('_', ' ')}</div>
          </div>
          <div className="card">
            <div className="small">Lead time cut-off</div>
            <div className="stat" style={{ fontSize: 18 }}>{theatre.leadTimeCutoffMin} minutes</div>
          </div>
        </div>
      </section>

      <div className="poster-row">
        {movies.map((movie) => (
          <Link key={movie.id} href={`/book?movie=${movie.id}`} className="poster-card">
            <img className="poster-image" src={movie.image} alt={movie.title} />
            <div className="poster-content">
              <div className="movie-chip">{movie.language} • {movie.duration}</div>
              <h3 className="poster-title">{movie.title}</h3>
              <p className="poster-copy">{movie.summary}</p>
              <div className="button cyan" style={{ marginTop: 18, width: 'fit-content' }}>Choose movie</div>
            </div>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
