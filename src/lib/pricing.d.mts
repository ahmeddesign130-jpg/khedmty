export type OrderPriceSnapshot = {
  servicePrice: number;
  commissionRate: 20;
  commission: string;
  providerNet: string;
  total: number;
};
export function calculateOrderPricing(finalPrice: number): OrderPriceSnapshot;
