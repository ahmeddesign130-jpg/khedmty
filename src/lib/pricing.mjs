export function calculateOrderPricing(finalPrice, commissionRate = 20) {
  if (!Number.isSafeInteger(finalPrice) || finalPrice <= 0 || finalPrice > 100_000_000) {
    throw new RangeError("FINAL_PRICE_INVALID");
  }
  if (!Number.isSafeInteger(commissionRate) || commissionRate < 0 || commissionRate > 50) {
    throw new RangeError("COMMISSION_RATE_INVALID");
  }

  const commission = Math.round((finalPrice * commissionRate) / 100);
  const providerNet = finalPrice - commission;

  return {
    servicePrice: finalPrice,
    commissionRate,
    commission,
    providerNet,
    total: finalPrice,
  };
}
