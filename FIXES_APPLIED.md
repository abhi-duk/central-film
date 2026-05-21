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

## 2026-05-21 Type export fix

- Added `Theatre` type in `lib/types.ts`.
- Re-exported `Theatre` from `lib/authority.ts` for older imports such as `import type { Theatre } from './authority'`.
- Added a compatibility `lib/server.ts` that returns theatre status from the central store without referencing non-existing fields.
- Verified again with:
  - `npm run typecheck`
  - `npm run build`


## 2026-05-21 package/install correction

- Root folder is now `central-film` instead of `central-film-v2`, so it can directly replace the old central project.
- `react` and `react-dom` are explicitly present in dependencies.
- `@types/*` and `typescript` are moved to devDependencies.
- `.npmrc` pins the public npm registry and disables audit/fund/progress noise for faster install.
- `package-lock.json` registry URLs were rewritten to public npm URLs.
- `next-env.d.ts` no longer imports `.next/types/routes.d.ts` before the first build.
