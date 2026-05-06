import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { setLogLevel } from 'firebase/firestore';
import * as fs from 'fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  setLogLevel('error');
  // Load DRAFT_firestore.rules instead of firestore.rules for now
  testEnv = await initializeTestEnvironment({
    projectId: 'test-project',
    firestore: {
      rules: fs.readFileSync('DRAFT_firestore.rules', 'utf8'),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv.cleanup();
});

const getDb = (uid?: string) => {
  if (uid) {
    return testEnv.authenticatedContext(uid, { email_verified: true }).firestore();
  }
  return testEnv.unauthenticatedContext().firestore();
};

const getUnverifiedDb = (uid: string) => {
  return testEnv.authenticatedContext(uid, { email_verified: false }).firestore();
};

describe('Trade Journal Security Rules', () => {
  const aliceUid = 'alice_user_123';
  const bobUid = 'bob_user_456';
  const tradeId = 'trade_001';
  const validTrade = {
    userId: aliceUid,
    pair: 'BTC/USDT',
    outcome: 'WIN',
    date: '2026-03-01T00:00:00.000Z',
    position: 'Long',
    pnlPercentage: 95.52,
    pnlAmount: 129,
    strategy: 'Strategy #1',
    createdAt: null, // Note: For testing, server timestamp is mocked.
    updatedAt: null,
  };

  it('1. Identity Spoofing', async () => {
    const db = testEnv.authenticatedContext(aliceUid, { email_verified: true });
    // Alice tries to create a trade for Bob
    await assertFails(
      db.firestore().doc(`users/${aliceUid}/trades/${tradeId}`).set({
        ...validTrade,
        userId: bobUid,
        createdAt: 'serverTimestamp',
        updatedAt: 'serverTimestamp'
      })
    );
  });

  it('2. Path Spoofing', async () => {
    const db = testEnv.authenticatedContext(aliceUid, { email_verified: true });
    // Alice tries to write to Bob's subcollection
    await assertFails(
      db.firestore().doc(`users/${bobUid}/trades/${tradeId}`).set({
        ...validTrade,
        userId: aliceUid,
        createdAt: 'serverTimestamp',
        updatedAt: 'serverTimestamp'
      })
    );
  });

  it('3. Ghost Field (Shadow Update)', async () => {
    const db = testEnv.authenticatedContext(aliceUid, { email_verified: true });
    await assertFails(
      db.firestore().doc(`users/${aliceUid}/trades/${tradeId}`).set({
        ...validTrade,
        isVerified: true,
        createdAt: 'serverTimestamp',
        updatedAt: 'serverTimestamp'
      })
    );
  });

  it('4. Missing Required Fields', async () => {
    const db = testEnv.authenticatedContext(aliceUid, { email_verified: true });
    await assertFails(
      db.firestore().doc(`users/${aliceUid}/trades/${tradeId}`).set({
        userId: aliceUid,
        outcome: 'WIN',
        // MISSING pair
        createdAt: 'serverTimestamp',
        updatedAt: 'serverTimestamp'
      })
    );
  });
  
  it('Valid Creation', async () => {
    const db = testEnv.authenticatedContext(aliceUid, { email_verified: true });
    await assertSucceeds(
       db.firestore().doc(`users/${aliceUid}/trades/${tradeId}`).set({
        ...validTrade,
        createdAt: 'serverTimestamp',
        updatedAt: 'serverTimestamp'
      })
    );
  });
});
