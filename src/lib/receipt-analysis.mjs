const EGP_CURRENCIES = new Set(["egp", "eg", "egyptian pound", "egyptian pounds", "le", "جنيه", "جنيه مصري"]);
export function classifyReceiptResult(result, expectedAmount) {
  if (!result || result.isTransferReceipt !== true) return "NOT_RECEIPT";
  if (!Number.isSafeInteger(expectedAmount) || expectedAmount <= 0) return "UNCLEAR";
  if (!Number.isSafeInteger(result.amount) || result.amount <= 0) return "UNCLEAR";
  if (!Number.isFinite(result.confidence) || result.confidence < 75) return "UNCLEAR";
  const currency = typeof result.currency === "string" ? result.currency.trim().toLowerCase() : "";
  if (!EGP_CURRENCIES.has(currency)) return "UNCLEAR";
  return result.amount === expectedAmount ? "MATCH" : "MISMATCH";
}
