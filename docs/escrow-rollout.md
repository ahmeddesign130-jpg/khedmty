# Khedmty internal escrow accounting rollout

This feature is an internal accounting workflow for manually received wallet transfers. It is **not** a regulated escrow account, a segregated client-money account, custody service, or automatic payment rail. Funds continue to arrive in the configured ordinary receiving wallet.

## State and accounting rules

- Payment approval creates one OrderEscrow in HELD and one immutable HOLD ledger entry for the full customer total.
- The original amount is split into the provider service amount and the existing platform fee. No commission setting or fee calculation is changed.
- Customer receipt confirmation changes the order to COMPLETED but does not release funds automatically. An administrator must make the external provider transfer first and then record its reference.
- A dispute changes the order and escrow to DISPUTED. Only an active administrator can resolve it to provider release or customer refund.
- Refunds and provider releases require an external transfer reference and create unique idempotency keys. Database uniqueness and conditional state updates prevent a second release/refund entry.
- Customers and providers cannot write escrow balances, ledger entries, resolution decisions, or transfer references.

## Database rollout

The migration is additive and backfills previously approved paid orders as HELD. It deliberately aborts if a paid/complete order cannot be matched to exactly one approved payment with a consistent amount split, or if an approved payment belongs to a cancelled/rejected order. Reconcile such records before retrying.

Before deploying application code:

1. Back up the production database.
2. Review the migration and reconcile any preflight exception.
3. Run npx prisma migrate deploy against the intended database.
4. Verify all existing approved paid orders have exactly one OrderEscrow and HOLD entry.
5. Deploy the reviewed application commit only after the schema migration succeeds.

Do not use prisma db push as a substitute for this migration. Do not deploy the application before the migration has been applied.

## Manual transfer procedure

For release/refund, the administrator must independently verify and perform the actual wallet transfer outside Khedmty. Only after it has succeeded should the administrator enter the external transaction reference and record the decision in the admin escrow screen. The app records the administrator's statement and ledger event; it does not execute or verify the external transfer itself.

Obtain local legal/accounting advice before advertising this workflow as escrow or holding customer funds. The current UI intentionally describes it as internal accounting only.
