# Khedmty Platform Upgrade Plan

This work is isolated on the `platform-upgrade` branch. It must not be deployed to Production until the build, database compatibility, authorization, and end-to-end tests pass.

## Product rules that must remain unchanged
- Arabic RTL, mobile-first, orange/white/navy visual identity.
- Western digits (0-9) and currency label exactly `EG`.
- Preserve the existing administrator account and all existing customer/provider/order/payment data.
- Phone numbers are not unique; the same phone may be used by multiple accounts.
- Customers may use the marketplace after account verification.
- Providers remain pending until private identity/profile verification is reviewed and approved by an administrator.
- Identity documents and private provider details must never be exposed in public service pages, storefronts, client payloads, or public storage.
- Digital files are delivered only after the related payment has been explicitly approved.
- Keep the existing manual payment workflow and configurable commission; do not silently change the current 20% rule.
- Never put secrets, identity data, or payment receipts in logs.

## Workstreams

### 0. Baseline and safety audit
- Map existing routes, Prisma models, API authorization, storage access, and payment/order transitions.
- Establish build, lint, typecheck, and test baselines.
- Verify every private route and server action checks the current database-backed role/status.
- Verify uploads are constrained by owner, MIME type, size, and private/public bucket.
- Verify a customer cannot fetch a digital asset before payment approval.
- Preserve production data; use additive migrations only and back up before any schema migration.

### 1. Marketplace experience
- Publicly browse approved digital services without requiring a login; require an authenticated customer only when ordering.
- Search by service title, description, and globally unique service number.
- Add useful filters and sorting (category, price, newest, best-selling, highest-rated) only when supported by real data.
- Improve service detail pages with safe media previews and clear final price/commission information.

### 2. Provider storefronts
- Provider-owned storefront profile with title, slug, description, avatar/cover, and approved services.
- Storefront is visible only while its provider is approved and active.
- Provider can edit only their own storefront; administrators can moderate it.

### 3. Reviews and ratings
- Reviews tied to completed/eligible paid orders, one review per order.
- Validate rating range server-side; prevent self-reviews and duplicate reviews.
- Moderation and reporting controls for administrators.

### 4. Notifications
- In-app notifications for order, payment, service review, provider approval/rejection, and message events.
- Read/unread state and server-side recipient authorization.
- Email notifications only where configured; never claim delivery if no provider is configured.

### 5. Messaging
- Customer/provider conversation tied to a valid order or service inquiry.
- Only participants and authorized administrators can read messages.
- Attachment uploads use private storage and signed URLs with strict ownership checks.
- Rate limits, content limits, and report/block controls.

### 6. Coupons and offers
- Admin-managed codes with start/end dates, usage limits, per-user limits, active state, and fixed/percentage discounts.
- Validate and reserve coupon use transactionally at checkout.
- Prevent negative totals and stacking unless explicitly configured.

### 7. Loyalty and referrals
- Referral codes with abuse controls and eligibility rules.
- Ledger-based points/rewards; never modify balances without an auditable transaction.
- No cash-out promise unless a real payout workflow exists.

### 8. Admin analytics and operations
- Revenue, platform commission, provider net, order/payment statuses, new users, and top services.
- Aggregate queries only; private identity data excluded from analytics.
- Audit trail for sensitive admin actions and moderation decisions.

### 9. Security and reliability
- Add rate limits to authentication, OTP, password reset, uploads, order creation, and messaging.
- Harden security headers, input validation, output minimization, and error handling.
- Verify secure cookies, CSRF protections where needed, and safe redirects.
- Review database indexes and transaction boundaries.
- Add automated tests for role boundaries, payment approval, file access, coupons, reviews, and provider privacy.

### 10. Release gates
- Run `npm run typecheck`, `npm run lint`, `npm test`, and production build.
- Run migration checks against a non-production database first.
- Test customer, provider, and admin flows on mobile.
- Confirm no destructive database operation and no Production environment mutation.
- Deploy only after the user confirms the release and the Vercel deployment quota is available.
