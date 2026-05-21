import './globals.css';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'KSFDC Central Ticketing',
  description: 'Central theatre ticket booking prototype with local node sync.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main className="shell">
          <header className="topbar">
            <Link href="/" className="brand">
              <div className="logo">🎬</div>
              <div>
                <strong>KSFDC Central</strong>
                <div className="mini-note">Online booking, reports and reconciliation</div>
              </div>
            </Link>
            <nav className="nav">
              <Link href="/">Home</Link>
              <Link href="/book">Book tickets</Link>
              <Link href="/reports">Reports</Link>
              <Link href="/policies">Policies</Link>
            </nav>
          </header>
          {children}
        </main>
      </body>
    </html>
  );
}
