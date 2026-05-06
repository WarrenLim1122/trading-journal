export function getMT5ContractSize(pair: string, marketType?: string): number {
  if (marketType === "Stock" || marketType === "Crypto") return 1;

  const upperPair = pair.toUpperCase().trim();

  // Basic indices/crypto
  if (upperPair === "BTCUSD" || upperPair.includes("BTC")) return 1;
  if (upperPair === "ETHUSD" || upperPair.includes("ETH")) return 1;
  
  // Precious metals
  if (upperPair === "XAUUSD" || upperPair === "GOLD") return 100;
  if (upperPair === "XAGUSD" || upperPair === "SILVER") return 5000;
  if (upperPair === "XPTUSD" || upperPair === "PLATINUM") return 100;

  // Major Indices (often 1 or 10 depending on broker, fallback to 1 as standard for MT5 index CFD usually, though sometimes 10)
  if (upperPair.includes("US30") || upperPair.includes("SPX") || upperPair.includes("NAS100") || upperPair.includes("NDX")) return 1;
  
  // Standard Forex (EURUSD, GBPUSD, USDJPY, AUDUSD, USDCAD, USDCHF, NZDUSD, etc.)
  // Often 6 characters long or with a / or -
  const stripSpecial = upperPair.replace(/[^A-Z]/g, '');
  if (marketType === "Forex" || stripSpecial.length === 6) {
    // If it's a forex pair, contract size = 100000 
    return 100000;
  }

  // Stock CFDs commonly 1 share
  return 1;
}

export function autoCalculatePnL(
  pair: string,
  entryPrice?: number,
  exitPrice?: number, // Usually tpPrice or slPrice or manual exit
  volume?: number, // Lot size
  position?: "Long" | "Short",
  marketType?: string
): number | undefined {
  if (entryPrice === undefined || exitPrice === undefined || volume === undefined || position === undefined) {
    return undefined;
  }

  const contractSize = getMT5ContractSize(pair, marketType);
  
  let pnl = undefined;
  if (position === "Long") {
    pnl = (exitPrice - entryPrice) * volume * contractSize;
  } else if (position === "Short") {
    pnl = (entryPrice - exitPrice) * volume * contractSize;
  }
  
  return pnl;
}
