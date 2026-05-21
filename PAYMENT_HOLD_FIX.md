# Payment hold fix

Issue fixed:

`/book/pay?holdId=...&showId=...` showed `Seat hold not found` on Vercel because the hold was created in one serverless route runtime and the payment page was rendered in another runtime. In-memory hold state is not reliable across Vercel serverless invocations when MySQL is not configured.

Fix applied:

- `/api/bookings/hold` now returns a compact `holdToken` along with `holdId` and `showId`.
- `BookingChooser` redirects to `/book/pay` with `holdId`, `showId`, and `holdToken`.
- `/book/pay/page.tsx` first checks DB/memory hold, then falls back to the durable `holdToken`.
- `/api/bookings/confirm` accepts the same `holdToken`, so Payment Success works even if the runtime instance changes.
- The token is compact and contains only the selected hold details, not the full seat map.

Tested:

- `npm run typecheck`
- `npm run build`
- `/api/bookings/hold` -> `/book/pay?...&holdToken=...` -> `/api/bookings/confirm`
