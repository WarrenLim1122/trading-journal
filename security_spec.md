# Security Specification - Trade Journal

## Data Invariants
1. A trade must belong to the user defined in the path `userId`.
2. A trade's `userId` field must exactly match the `request.auth.uid` and the path's `{userId}`.
3. Essential fields such as `pair`, `outcome`, `position`, and `createdAt` cannot be omitted.
4. `imageUrl` must be a string and appropriately sized if provided.
5. Users cannot update `userId` or `createdAt` fields once a trade is created.
6. Only the owner can list, get, create, update, or delete their trades.

## The "Dirty Dozen" Payloads

1. **Identity Spoofing**: Attempt to create a trade with `{ userId: "other_user_id", ... }` where `request.auth.uid != other_user_id`.
2. **Path Spoofing**: Attempt to create a trade in `/users/other_user_uid/trades/123` with `{ userId: request.auth.uid }`.
3. **Ghost Field (Shadow Update)**: Attempt to create a trade with unexpected fields like `{ isVerified: true, isAdmin: true, ... }`.
4. **Missing Required Fields**: Attempt to create a trade with no `pair` or `outcome`.
5. **Type Violation**: Submit a trade where `pnlPercentage` is a massive string instead of a number.
6. **Denial of Wallet**: Submit an enormous string for `notes` or `pair` (> 1MB).
7. **Enum Violation**: Submit a trade where `outcome` is `"SCAM"`.
8. **Temporal Spoofing**: Attempt to set `createdAt` or `updatedAt` to a client-side timestamp instead of `request.time`.
9. **Immutability Breach**: Attempt to update an existing trade's `createdAt` or `userId`.
10. **ID Poisoning**: Use an extremely long or path-traversing ID for `{tradeId}`.
11. **Excessive List Constraints**: Pass an array into `imageUrl` instead of a string.
12. **Unauthorized Read**: Attempt to query a different user's subcollection.

## The Test Runner (firestore.rules.test.ts)
We will test these payloads in `firestore.rules.test.ts` to ensure `PERMISSION_DENIED`.
