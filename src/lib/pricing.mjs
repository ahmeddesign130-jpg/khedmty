export function calculateOrderPricing(finalPrice) {
  if (!Number.isSafeInteger(finalPrice) || finalPrice <= 0 || finalPrice > 100_000_000) {
    throw new RangeError("FINAL_PRICE_INVALID");
  }

  const total = finalPrice;
  const commissionRate = 20;
  const commission = (total * commissionRate / 100).toFixed(2);
  const providerNet = (total - Number(commission)).toFixed(2);

  return {
    servicePrice: total,
    commissionRate,
    commission,
    providerNet,
    total,
  };
}
