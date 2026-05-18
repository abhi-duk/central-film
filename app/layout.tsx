import './globals.css';
import Link from 'next/link';

export const metadata = { title: 'KSFDC Central Ticketing' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <header className="topbar">
            <div className="topbar-inner">
              <div className="brand">
                <div className="brand-mark" />
                <div>
                  <div className="brand-kicker">Central Online Server</div>
                  <div className="brand-title">KSFDC Hybrid Ticketing</div>
                </div>
              </div>
              <nav className="nav">
                <Link href="/" className="nav-link">Dashboard</Link>
                <Link href="/book" className="nav-link">Book Tickets</Link>
                <Link href="/reports" className="nav-link">Reports</Link>
                <Link href="/policies" className="nav-link">Policy Settings</Link>
              </nav>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
