# Khedmty setup: Supabase Storage and database

## Adjustable commission
The platform commission remains a percentage, not a fixed 100 EG amount. The administrator can change it at `/admin/settings` from 0 to 100 percent. New orders save a snapshot of the percentage and amount; existing orders are not recalculated.

## Supabase Storage setup
1. Create a Supabase project.
2. Open Storage and create two buckets:
   - `service-media`: set to **Public** (service photos/videos are visible to marketplace visitors).
   - `payment-receipts`: keep **Private** (only the server creates short-lived signed links for admin review).
3. In Supabase Project Settings → API, copy the Project URL and the `service_role` secret key.
4. In Vercel → Project `khedmty` → Settings → Environment Variables, add these variables to Production and Preview:
   - `SUPABASE_URL` = the Project URL.
   - `SUPABASE_SERVICE_ROLE_KEY` = the service_role secret key.
   - `INSTAPAY_ADDRESS` = the actual InstaPay receiving address (optional until supplied).
   - `E_AND_MONEY_NUMBER` = the actual receiving number (optional until supplied).
   - `ETISALAT_CASH_NUMBER` = the actual receiving number (optional until supplied).
5. Never add the service_role key with a `NEXT_PUBLIC_` prefix and never share it in chat or commit it to GitHub.
6. Redeploy the Vercel project after adding the variables.

The application requests short-lived signed upload URLs on the server. Providers can upload JPG/PNG/WEBP images (up to 8 MB) and MP4/WEBM/MOV videos (up to 40 MB). Customer payment receipts are image-only (up to 8 MB) and stay in the private bucket.

## Database schema update (required once)
The new `Service.mediaUrls` field stores uploaded service media URLs, and `Service.reviewNote` stores admin feedback/rejection reasons for providers. After reviewing a database backup, run this non-resetting command once against the production database:

```bash
npx prisma db push
```

This syncs the Prisma schema without resetting the database. If you have a PostgreSQL SQL console instead of a terminal, the equivalent additive SQL is in `database/add_service_media_columns.sql`. Do **not** run `db:reset` or `--force-reset`.

## Payment destinations
Only configure wallet destinations that are actually controlled by the platform. The payment page intentionally does not display the wallet owner's name. Until the environment variables are set, customers see a notice that payment details are not configured; no fake numbers are shown.
