import { collection, doc, query, where, getDocs, addDoc, updateDoc, deleteDoc, serverTimestamp, setDoc, writeBatch } from "firebase/firestore";
import { db, auth } from "./firebase";
import { Trade } from "../types/trade";
import { ARCHIVE_PHASE_ID } from "./propPhaseService";
import { v4 as uuidv4 } from "uuid";

enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const tradeService = {
  getTrades: async (userId: string): Promise<Trade[]> => {
    const pathForGetDocs = `users/${userId}/trades`;
    try {
      if (!userId) return [];
      const q = query(collection(db, pathForGetDocs));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Trade[];
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, pathForGetDocs);
      return [];
    }
  },

  addTrade: async (userId: string, tradeData: Omit<Trade, "id" | "userId" | "createdAt" | "updatedAt">): Promise<void> => {
    const tradeId = uuidv4();
    const pathForWrite = `users/${userId}/trades/${tradeId}`;
    try {
      // Strip undefined fields to prevent Firebase setDoc errors
      const cleanData: any = {};
      Object.entries(tradeData).forEach(([key, value]) => {
        if (value !== undefined) {
          cleanData[key] = value;
        }
      });
      
      await setDoc(doc(db, `users/${userId}/trades`, tradeId), {
        ...cleanData,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
       handleFirestoreError(error, OperationType.WRITE, pathForWrite);
    }
  },

  updateTrade: async (userId: string, tradeId: string, tradeData: Partial<Omit<Trade, "id" | "userId" | "createdAt">>): Promise<void> => {
      const pathForUpdate = `users/${userId}/trades/${tradeId}`;
      try {
        const cleanData: any = {};
        Object.entries(tradeData).forEach(([key, value]) => {
          if (value !== undefined) {
             cleanData[key] = value;
          }
        });
        await updateDoc(doc(db, pathForUpdate), {
          ...cleanData,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
         handleFirestoreError(error, OperationType.UPDATE, pathForUpdate);
      }
  },

  // Move a single trade into the Archive folder (tag with the reserved sentinel)
  // instead of deleting it. It disappears from the active Dashboard and shows on
  // the Archive page. Writes throw on failure.
  archiveTrade: async (userId: string, tradeId: string): Promise<void> => {
    const pathForUpdate = `users/${userId}/trades/${tradeId}`;
    try {
      await updateDoc(doc(db, pathForUpdate), {
        propPhaseId: ARCHIVE_PHASE_ID,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, pathForUpdate);
    }
  },

  // Bulk-archive: tag many trades with ARCHIVE_PHASE_ID in 500-op batches.
  archiveTradesBatch: async (userId: string, tradeIds: string[]): Promise<void> => {
    const path = `users/${userId}/trades (archive batch ${tradeIds.length})`;
    try {
      const CHUNK = 500;
      for (let i = 0; i < tradeIds.length; i += CHUNK) {
        const chunk = tradeIds.slice(i, i + CHUNK);
        const batch = writeBatch(db);
        chunk.forEach((id) =>
          batch.update(doc(db, "users", userId, "trades", id), {
            propPhaseId: ARCHIVE_PHASE_ID,
            updatedAt: serverTimestamp(),
          }),
        );
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  deleteTrade: async (userId: string, tradeId: string): Promise<void> => {
      const pathForDelete = `users/${userId}/trades/${tradeId}`;
      try {
        await deleteDoc(doc(db, pathForDelete));
      } catch (error) {
         handleFirestoreError(error, OperationType.DELETE, pathForDelete);
      }
  },

  deleteTradesBatch: async (userId: string, tradeIds: string[]): Promise<void> => {
    const pathForDelete = `users/${userId}/trades (batch ${tradeIds.length})`;
    try {
      const CHUNK = 500;
      for (let i = 0; i < tradeIds.length; i += CHUNK) {
        const chunk = tradeIds.slice(i, i + CHUNK);
        const batch = writeBatch(db);
        chunk.forEach((id) =>
          batch.delete(doc(db, "users", userId, "trades", id))
        );
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, pathForDelete);
    }
  },
};
