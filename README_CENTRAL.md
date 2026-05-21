# KSFDC Central Ticketing App

This central app was rebuilt to match the working `local-theatre-app` structure.

## Run

```powershell
cd D:\film\central-film
copy .env.example .env.local
npm install --no-audit --no-fund --progress=false
npm run build
npm run dev
```

## Database

Create a MySQL database named `film_central`, or edit `.env.local`.

```sql
CREATE DATABASE film_central CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

The app creates/updates its tables automatically on first load.

## Important endpoints

- `POST /api/heartbeat` receives local theatre heartbeat.
- `GET /api/theatres/:theatreId/authority` is used by the local app.
- `POST /api/sync/local-bookings` receives local confirmed bookings.
- `GET /api/live/show?showId=SHOW_EMP_001` returns central seat map.
- `POST /api/bookings/hold` holds seats for central online booking.
- `POST /api/bookings/confirm` confirms payment and issues central ticket.

## Payment success fix

The payment page now passes both `holdId` and `showId`, but the confirm API can also recover `showId` from the hold record. So the earlier `holdId and showId are required` issue is removed.
