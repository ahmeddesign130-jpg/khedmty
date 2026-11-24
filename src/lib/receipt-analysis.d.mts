export type ReceiptModelResult = {
  isTransferReceipt: boolean;
  amount: number | null;
  currency: string | null;
  reference: string | null;
  transferDate: string | null;
  confidence: number;
  notes: string;
};
export type ReceiptMatchStatus = "MATCH" | "MISMATCH" | "NOT_RECEIPT" | "UNCLEAR";
export function classifyReceiptResult(result: ReceiptModelResult | null, expectedAmount: number): ReceiptMatchStatus;
