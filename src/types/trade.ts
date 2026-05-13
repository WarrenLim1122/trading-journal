export interface Trade {
  id: string; // Document ID
  userId: string;
  pair: string; // legacy / manual symbol
  symbol?: string; // MT5 symbol
  outcome: "WIN" | "LOSE" | "LOSS" | "BREAKEVEN";
  date: string; // ISO String mapping to older manually entered dates
  position: "Long" | "Short" | "LONG" | "SHORT"; // Add ALL caps to match bot payload
  direction?: "LONG" | "SHORT"; // Bot direction
  strategy?: string;
  strategyName?: string; // Bot strategy name
  marketType?: "Forex" | "Stock" | "Crypto" | "Indices" | "Commodities" | string;
  isAutoCalculated?: boolean;
  pnlPercentage?: number;
  pnlAmount?: number; // legacy manual pnl amount
  imageUrl?: string; // legacy manual image
  entryPrice?: number;
  exitPrice?: number; // legacy closing price
  closePrice?: number; // Bot closing price
  takeProfit?: number;
  stopLoss?: number;
  volume?: number;
  ticket?: string;
  notes?: string;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
  
  // ============================
  // BOT JOURNALING ADDITIONS
  // ============================
  
  // Core Identity
  source?: "manual" | "bot" | "import";
  botName?: string;
  accountType?: "personal" | "prop" | "demo" | "live";
  broker?: string;
  mt5AccountId?: string;
  magicNumber?: string;
  
  // Timing
  openTime?: string; // ISO String
  closeTime?: string; // ISO String
  closeReason?: "TP" | "SL" | "NEWS" | "MANUAL" | "BOT_LOGIC" | "EXPIRED" | "UNKNOWN";
  
  // Actual MT5 Result
  grossPnl?: number;
  commission?: number;
  swap?: number;
  netPnl?: number;
  accountCurrency?: string;
  
  // Risk/Reward
  estimatedRisk?: number;
  estimatedReward?: number;
  estimatedPnl?: number;
  rrRatio?: number;
  pnlDifference?: number;
  
  // Classification
  tags?: string[];
  
  // Screenshot / Chart Fields
  outcomeScreenshotUrl?: string;
  outcomeScreenshotSource?: "python_generated" | "mt5" | "tradingview" | "manual";
  outcomeScreenshotCapturedAt?: string; // ISO string
  outcomeScreenshotStatus?: "captured" | "failed" | "not_available";
  outcomeScreenshotReason?: "TP" | "SL" | "MANUAL" | "BREAKEVEN" | "UNKNOWN";
  
  rrChartUrl?: string;
  rrChartSource?: "python_generated" | "mt5_overlay" | "manual";
  rrChartCapturedAt?: string; // ISO string
  
  // System Metadata
  importedAt?: any; // Firestore Timestamp
  rawMt5Data?: string | any; // Raw JSON payload or string
  rawTelegramMessage?: string;
}
