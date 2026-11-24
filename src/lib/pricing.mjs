function formatPiastres(amount) {
  const whole = Math.floor(amount / 100);
  const fraction = String(amount % 100).padStart(2, "0");
  return `${whole}.${fraction}`;
}

export function calculateOrderPricing(finalPrice) {
  if (!Number.isSafeInteger(finalPrice) || finalPrice <= 0 || finalPrice > 100_000_000) {
    throw new RangeError("FINAL_PRICE_INVALID");
  }

  const total = finalPrice;
  const commissionRate = 20;
  const commission = formatPiastres(total * commissionRate);
  const providerNet = formatPiastres(total * (100 - commissionRate));

  return {
    servicePrice: total,
    commissionRate,
    commission,
    providerNet,
    total,
  };
}
