# Central Film fixes applied

## Build fixes

- Added backward-compatible exports used by older central pages/routes:
  - `ensureCentralSchema`
  - `readMysqlStore`
  - `saveCentralBooking`
  - `resolvePendingTransaction`
  - `markTimedOutTheatres`
  - `getDb`
- Added missing route/page support:
  - `/policies`
  - `/api/policies`
  - `/api/theatres/[theatreId]/authority`
  - `/api/bookings/hold-details`
  - `/api/bookings/release`
  - `/api/sync/local-bookings`
  - `/ticket/[bookingId]`
- Added `components/PageShell.tsx` and `lib/authority.ts`.
- `npm run typecheck` passes.
- `npm run build` passes on Next.js 16.2.0 with Turbopack.

## Payment success fix

Earlier the payment success flow could lose `showId`, producing:

`holdId and showId are required`

The seat hold API now returns both `holdId` and `showId`, and the UI redirects to:

`/book/pay?holdId=...&showId=...`

The payment page also loads hold details server-side, so even if `showId` is missing from the URL, it can recover the show from the saved hold record.

## Important run command

After replacing the folder, run:

```bash
cd central-film
npm install
npm run build
npm run dev
```

If you use MySQL, copy `.env.example` to `.env.local` and update the database values. If no MySQL is configured, the prototype runs in memory/demo mode.
