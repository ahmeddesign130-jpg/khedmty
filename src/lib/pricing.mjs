export function calculateOrderPricing(finalPrice) {
  if (!Number.isSafeInteger(finalPrice) || finalPrice <= 0 || finalPrice > 100_000_000) {
    throw new RangeError("FINAL_PRICE_INVALID");
  }

  const total = finalPrice;
  const commissionRate = 20;
  const commission = Math.round((total * commissionRate) / 100);
  const providerNet = total - commission;

  return {
    servicePrice: total,
    commissionRate,
    commission,
    providerNet,
    total,
  };
}
