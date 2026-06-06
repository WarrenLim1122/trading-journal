import {
  collection,
  doc,
  query,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { db, auth } from "@journal/lib/firebase";
import { Trade } from "@journal/types/trade";
import { Cashflow } from "@journal/types/cashflow";
import {
  PropPhase,
  PropPhaseStage,
  PropPhaseOutcome,
} from "@journal/types/propPhase";
import { getTradePnl, getTradeDate } from "@journal/lib/tradeUtils";

enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  GET = "get",
  WRITE = "write",
  PUBLISH = "publish",
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path,
  };
  console.error("Firestore Error (propPhase): ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Firestore writeBatch supports at most 500 ops per batch.
const BATCH_LIMIT = 500;

// Reserved `propPhaseId` sentinel for the Archive folder. Deleting a prop-firm
// folder retags its trades + cashflows with this value instead of untagging them,
// so they move to the Archive page rather than re-appearing on the active Dashboard.
// It is NOT a real propPhases doc, so it never shows as a phase card.
export const ARCHIVE_PHASE_ID = "__archive__";

function cashflowNet(c: Cashflow): number {
  return c.type === "deposit" ? c.amount : -c.amount;
}

export interface PublishPhaseMetadata {
  name: string;
  accountSize: number;
  stage: PropPhaseStage;
  outcome: PropPhaseOutcome;
  notes?: string;
}

export const propPhaseService = {
  /**
   * Read all phases for this user, sorted by closedAt desc (most recent first).
   * Fails soft — returns [] on error so callers don't hang.
   */
  getPhases: async (userId: string): Promise<PropPhase[]> => {
    const path = `users/${userId}/propPhases`;
    try {
      if (!userId) return [];
      const q = query(collection(db, path));
      const snap = await getDocs(q);
      const phases = snap.docs.map(d => ({ id: d.id, ...d.data() })) as PropPhase[];
      phases.sort((a, b) => {
        const aT = a.closedAt || "";
        const bT = b.closedAt || "";
        // desc — latest first
        return bT.localeCompare(aT);
      });
      return phases;
    } catch (error) {
      console.error("Firestore Error (propPhase GET):", JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        userId: auth.currentUser?.uid,
        path,
      }));
      return [];
    }
  },

  /**
   * Read a single phase doc. Fails soft — returns null on error / missing.
   */
  getPhase: async (userId: string, phaseId: string): Promise<PropPhase | null> => {
    const path = `users/${userId}/propPhases/${phaseId}`;
    try {
      if (!userId || !phaseId) return null;
      const snap = await getDoc(doc(db, path));
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() } as PropPhase;
    } catch (error) {
      console.error("Firestore Error (propPhase GET single):", JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        userId: auth.currentUser?.uid,
        path,
      }));
      return null;
    }
  },

  /**
   * Edit phase metadata (used by EditPhaseMetadataDialog). Writes throw.
   */
  updatePhase: async (
    userId: string,
    phaseId: string,
    partial: Partial<Omit<PropPhase, "id" | "userId" | "createdAt">>,
  ): Promise<void> => {
    const path = `users/${userId}/propPhases/${phaseId}`;
    try {
      const clean: any = {};
      Object.entries(partial).forEach(([k, v]) => { if (v !== undefined) clean[k] = v; });
      await updateDoc(doc(db, path), { ...clean, updatedAt: serverTimestamp() });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  /**
   * Delete a phase: re-tag every trade + cashflow that pointed at it with the
   * Archive sentinel (so they move to the Archive page, NOT back to the active
   * Dashboard), then delete the phase doc. Both passes are paginated into
   * 500-op batches. Writes throw on failure.
   */
  deletePhase: async (
    userId: string,
    phaseId: string,
  ): Promise<void> => {
    const path = `users/${userId}/propPhases/${phaseId}`;
    try {
      // Pull all trades + cashflows once, filter to this phase's tagged docs.
      const tradesSnap = await getDocs(query(collection(db, `users/${userId}/trades`)));
      const cashflowsSnap = await getDocs(query(collection(db, `users/${userId}/cashflows`)));

      const taggedTradeIds = tradesSnap.docs
        .filter(d => (d.data() as Trade).propPhaseId === phaseId)
        .map(d => d.id);
      const taggedCashflowIds = cashflowsSnap.docs
        .filter(d => (d.data() as Cashflow).propPhaseId === phaseId)
        .map(d => d.id);

      // Re-tag trades to the Archive folder (paginated).
      for (let i = 0; i < taggedTradeIds.length; i += BATCH_LIMIT) {
        const chunk = taggedTradeIds.slice(i, i + BATCH_LIMIT);
        const batch = writeBatch(db);
        chunk.forEach(id => {
          batch.update(doc(db, `users/${userId}/trades/${id}`), {
            propPhaseId: ARCHIVE_PHASE_ID,
            updatedAt: serverTimestamp(),
          });
        });
        await batch.commit();
      }

      // Re-tag cashflows to the Archive folder (paginated).
      for (let i = 0; i < taggedCashflowIds.length; i += BATCH_LIMIT) {
        const chunk = taggedCashflowIds.slice(i, i + BATCH_LIMIT);
        const batch = writeBatch(db);
        chunk.forEach(id => {
          batch.update(doc(db, `users/${userId}/cashflows/${id}`), {
            propPhaseId: ARCHIVE_PHASE_ID,
            updatedAt: serverTimestamp(),
          });
        });
        await batch.commit();
      }

      // Finally, delete the phase doc itself.
      await deleteDoc(doc(db, path));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  /**
   * Publish the current active phase: snapshot starting/ending balances,
   * tag every untagged trade + cashflow with the new phase id, and return
   * the new phase id.
   *
   * Caller (Dashboard) passes the unfiltered trades + cashflows arrays
   * already in component state — no re-fetch needed inside the service.
   *
   * Bot race: Firestore semantics handle this naturally — any trade the
   * bot inserts mid-publish stays untagged and joins the new active phase.
   * See handoff §3.6.
   */
  publishPhase: async (
    userId: string,
    metadata: PublishPhaseMetadata,
    allTrades: Trade[],
    allCashflows: Cashflow[],
    startBalance: number,
    anchors: { pnl: number; cashflow: number } = { pnl: 0, cashflow: 0 },
  ): Promise<string> => {
    const newPhaseId = uuidv4();
    const path = `users/${userId}/propPhases/${newPhaseId}`;
    try {
      // Pull existing phases so we can compute startedAt.
      const existingPhases = await propPhaseService.getPhases(userId);

      const untaggedTrades = allTrades.filter(t => !t.propPhaseId);
      const untaggedCashflows = allCashflows.filter(c => !c.propPhaseId);

      // ===== startingBalance =====
      // The caller-supplied baseline IS the phase's starting balance — what the
      // user set as their equity at the start of this phase (header pencil).
      // No cumulative seed math: each phase records the baseline the user actually
      // chose for that phase, not a value derived from prior phases.
      const startingBalance = startBalance;

      // ===== endingBalance =====
      // startingBalance + Σ(untagged P&L + cashflow net) − anchors. Anchors
      // (default {0,0}) represent the snapshot of untagged sums at the moment
      // the user last reset the baseline, so pre-reset activity doesn't bleed
      // into this phase's ending balance. With no reset, anchors are 0 and
      // this reduces to the original formula.
      let untaggedPnl = 0;
      untaggedTrades.forEach(t => { untaggedPnl += getTradePnl(t); });
      let untaggedCash = 0;
      untaggedCashflows.forEach(c => { untaggedCash += cashflowNet(c); });
      const effectivePnl = untaggedPnl - anchors.pnl;
      const effectiveCash = untaggedCash - anchors.cashflow;
      const endingBalance = startingBalance + effectivePnl + effectiveCash;

      // ===== startedAt =====
      // Previous phase's closedAt if any phase exists; else earliest
      // untagged-trade date; else seed-moment (now).
      let startedAt: string;
      if (existingPhases.length > 0) {
        // getPhases is sorted desc — first element is most recent.
        startedAt = existingPhases[0].closedAt || new Date().toISOString();
      } else if (untaggedTrades.length > 0) {
        let earliest = getTradeDate(untaggedTrades[0]);
        untaggedTrades.forEach(t => {
          const d = getTradeDate(t);
          if (d && d < earliest) earliest = d;
        });
        startedAt = earliest;
      } else {
        startedAt = new Date().toISOString();
      }

      const closedAt = new Date().toISOString();

      // ===== Create the phase doc =====
      const phaseDoc: any = {
        userId,
        name: metadata.name,
        accountSize: metadata.accountSize,
        stage: metadata.stage,
        outcome: metadata.outcome,
        startedAt,
        closedAt,
        startingBalance,
        endingBalance,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (metadata.notes !== undefined) phaseDoc.notes = metadata.notes;

      await setDoc(doc(db, path), phaseDoc);

      // ===== Tag untagged trades (paginated) =====
      const untaggedTradeIds = untaggedTrades.map(t => t.id);
      for (let i = 0; i < untaggedTradeIds.length; i += BATCH_LIMIT) {
        const chunk = untaggedTradeIds.slice(i, i + BATCH_LIMIT);
        const batch = writeBatch(db);
        chunk.forEach(id => {
          batch.update(doc(db, `users/${userId}/trades/${id}`), {
            propPhaseId: newPhaseId,
            updatedAt: serverTimestamp(),
          });
        });
        await batch.commit();
      }

      // ===== Tag untagged cashflows (paginated) =====
      const untaggedCashflowIds = untaggedCashflows.map(c => c.id);
      for (let i = 0; i < untaggedCashflowIds.length; i += BATCH_LIMIT) {
        const chunk = untaggedCashflowIds.slice(i, i + BATCH_LIMIT);
        const batch = writeBatch(db);
        chunk.forEach(id => {
          batch.update(doc(db, `users/${userId}/cashflows/${id}`), {
            propPhaseId: newPhaseId,
            updatedAt: serverTimestamp(),
          });
        });
        await batch.commit();
      }

      return newPhaseId;
    } catch (error) {
      handleFirestoreError(error, OperationType.PUBLISH, path);
      // handleFirestoreError throws, but TS needs an explicit return for the type.
      throw error;
    }
  },
};
