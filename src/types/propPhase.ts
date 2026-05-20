export type PropPhaseStage =
  | "Challenge Phase 1"
  | "Challenge Phase 2"
  | "Verification"
  | "Funded"
  | "Other";

export type PropPhaseOutcome =
  | "Passed"
  | "Failed"
  | "Funded"
  | "Paid out"
  | "Other";

export interface PropPhase {
  id: string;
  userId: string;
  name: string;              // e.g. "FTMO"
  accountSize: number;       // paper $ — display only
  stage: PropPhaseStage;
  outcome: PropPhaseOutcome;
  notes?: string;
  startedAt: string;         // ISO — set at publish time = previous phase's closedAt, or null/seed
  closedAt: string;          // ISO — set at publish time = now
  startingBalance: number;
  endingBalance: number;
  createdAt: any;            // Firestore Timestamp
  updatedAt: any;
}
