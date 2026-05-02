export interface Trade {
  id: string; // Document ID
  userId: string;
  pair: string;
  outcome: "WIN" | "LOSE" | "BREAKEVEN";
  date: string; // ISO String
  position: "Long" | "Short";
  strategy?: string;
  pnlPercentage?: number;
  pnlAmount?: number;
  imageUrl?: string;
  entryPrice?: number;
  exitPrice?: number;
  takeProfit?: number;
  stopLoss?: number;
  volume?: number;
  ticket?: string;
  notes?: string;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}
