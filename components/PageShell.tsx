
import Link from 'next/link';
import { ConnectionBanner } from './ConnectionBanner';

export default function PageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <ConnectionBanner theatreId={process.env.THEATRE_ID || 'KSFDC_SREE_TVM'} />
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">CENTRAL ONLINE SERVER</p>
            <h1 className="mt-2 text-3xl font-bold md:text-4xl">{title}</h1>
            {subtitle ? <p className="mt-2 max-w-3xl text-slate-300">{subtitle}</p> : null}
          </div>
          <div className="flex gap-2">
            <Link href="/" className="btn btn-secondary">Home</Link>
            <Link href="/book" className="btn btn-primary">Book Tickets</Link>
            <Link href="/reports" className="btn btn-secondary">Reports</Link>
            <Link href="/policies" className="btn btn-secondary">Policies</Link>
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}
