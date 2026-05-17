import Link from 'next/link';

export function Nav() {
  return (
    <div className="nav">
      <Link href="/">Dashboard</Link>
      <Link href="/book">Book Online</Link>
      <Link href="/policies">Policies</Link>
      <Link href="/reports">Reports</Link>
      <Link href="/pending">Pending</Link>
    </div>
  );
}
