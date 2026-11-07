# Circle: private, opt-in live location for friends
Next.js 14 (App Router) · Tailwind · Supabase (Auth, Postgres, RLS, Realtime) · Leaflet + OpenStreetMap (CARTO dark tiles) · Framer Motion

## Structure
```
supabase/schema.sql          tables, RLS policies, RPCs, realtime, expiry job
middleware.ts                session refresh + route gating
lib/supabase/{client,server}.ts
components/{CircleView,ProfileForm}.tsx
app/ page.tsx (landing) · login · auth/callback · dashboard · join/[code] · circle/[id] · settings · privacy · api/account/delete
```
## Setup
1. **Supabase**: create a project. SQL Editor → paste and run `supabase/schema.sql`.
   Auth → URL Configuration: Site URL `http://localhost:3000`; add Redirect URLs `http://localhost:3000/auth/callback` and your production `https://YOUR-DOMAIN/auth/callback`.
   Auth → Providers: Email is on by default (magic links). For Google: create an OAuth Client (Web) in Google Cloud, use the callback URL shown in Supabase, paste the ID and secret.
   Database → Extensions: enable `pg_cron`, then run the commented `cron.schedule` line at the bottom of the schema to purge expired rows.
2. **Map**: no key needed. Tiles come from CARTO (free for light use, with attribution). Swap the tile URL in `components/CircleView.tsx` to change providers.
3. **Env**: `cp .env.example .env.local` and fill in the three Supabase values.
4. **Run**: `npm install && npm run dev` → http://localhost:3000 (localhost counts as a secure context, so geolocation works).
## Test
Open two browsers (or one normal + one private window), sign in as two emails. User A creates a Circle and copies the invite link. User B opens it, picks a name and joins. Both press *Start sharing*. Use Chrome DevTools → Sensors to fake movement. Verify: Stop sharing removes the marker instantly, and Settings → delete history clears your row.
## Deploy (Vercel)
Push to GitHub → import in Vercel → add the 3 env vars (keep the service-role key server-side) → deploy. Add the Vercel URL to Supabase redirect URLs. Geolocation requires HTTPS; Vercel provides it.
## Notes
- Browsers only deliver GPS while the page is open. Rows with no update for 5 minutes show as "last seen".
- Share trails are visible to all Circle members if the owner of the trail enables it; the toggle is per user.
