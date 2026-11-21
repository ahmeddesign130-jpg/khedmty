export type OrderPriceSnapshot = {
  servicePrice: number;
  commissionRate: 20;
  commission: number;
  providerNet: number;
  total: number;
};
export function calculateOrderPricing(finalPrice: number): OrderPriceSnapshot;
