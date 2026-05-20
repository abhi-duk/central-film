import './globals.css';
import AppChrome from '../components/AppChrome';

export const metadata = { title: 'Central Online Server' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="ocean">
      <body>
        <AppChrome theatreId={process.env.THEATRE_ID || 'KSFDC_SREE_TVM'} serverLabel="Central Online Server">{children}</AppChrome>
      </body>
    </html>
  );
}
