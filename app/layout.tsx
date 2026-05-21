import './globals.css';
import { HealthProvider } from '../components/ConnectionBanner';

export const metadata = { title: 'KSFDC Central Ticketing', description: 'Central booking, authority, sync and reconciliation console' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <HealthProvider>{children}</HealthProvider>
      </body>
    </html>
  );
}
