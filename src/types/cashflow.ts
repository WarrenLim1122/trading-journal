export interface Cashflow {
  id: string;
  userId: string;
  type: "deposit" | "withdrawal";
  amount: number; // always positive; `type` determines direction
  date: string; // ISO String
  note?: string;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}
