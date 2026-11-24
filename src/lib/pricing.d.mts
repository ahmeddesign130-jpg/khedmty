export type OrderPriceSnapshot = {
  servicePrice: number;
  commissionRate: number;
  commission: number;
  providerNet: number;
  total: number;
};
export function calculateOrderPricing(finalPrice: number, commissionRate?: number): OrderPriceSnapshot;
