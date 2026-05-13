import { collection, doc, query, getDocs, updateDoc, deleteDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db, auth } from "./firebase";
import { Cashflow } from "../types/cashflow";
import { v4 as uuidv4 } from "uuid";

enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  GET = "get",
  WRITE = "write",
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
  console.error("Firestore Error (cashflow): ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const cashflowService = {
  getCashflows: async (userId: string): Promise<Cashflow[]> => {
    const path = `users/${userId}/cashflows`;
    try {
      if (!userId) return [];
      const q = query(collection(db, path));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() })) as Cashflow[];
    } catch (error) {
      // Reads fail soft so the dashboard doesn't freeze on missing collection
      // or restrictive Firestore rules. Writes still surface errors.
      console.error("Firestore Error (cashflow GET):", JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        userId: auth.currentUser?.uid,
        path,
      }));
      return [];
    }
  },

  addCashflow: async (userId: string, data: Omit<Cashflow, "id" | "userId" | "createdAt" | "updatedAt">): Promise<void> => {
    const id = uuidv4();
    const path = `users/${userId}/cashflows/${id}`;
    try {
      const clean: any = {};
      Object.entries(data).forEach(([k, v]) => { if (v !== undefined) clean[k] = v; });
      await setDoc(doc(db, `users/${userId}/cashflows`, id), {
        ...clean,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  updateCashflow: async (userId: string, id: string, data: Partial<Omit<Cashflow, "id" | "userId" | "createdAt">>): Promise<void> => {
    const path = `users/${userId}/cashflows/${id}`;
    try {
      const clean: any = {};
      Object.entries(data).forEach(([k, v]) => { if (v !== undefined) clean[k] = v; });
      await updateDoc(doc(db, path), { ...clean, updatedAt: serverTimestamp() });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  deleteCashflow: async (userId: string, id: string): Promise<void> => {
    const path = `users/${userId}/cashflows/${id}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },
};
