# Firestore Trade Schema & Architecture

This document describes the structure of trading journal entries stored in Firestore, particularly focusing on the fields supported when inserting data automatically from external systems like an MT5 Execution Bot or Python processing script.

## Database Path Recommendation

**Recommended Path:** `users/{userId}/trades/{tradeId}`
Currently, the journaling application reads entries from the `trades` subcollection for the currently authenticated user.

## Deterministic ID Proposal

To prevent duplicate trades when polling or sending data, it is heavily recommended to use a **Deterministic Document ID**.
Format: `{accountType}_{mt5AccountId || 'manual'}_{ticket}`

Example ID: `live_87654321_9081234`
If a trade with this ID already exists, it can be updated or skipped. 

## The `Trade` Schema (Phase 2)

The trade schema has been extended to capture richer execution and timing data. All fields are optional but recommended where applicable.

### Identity & Core Data
- `id` (string): The document ID.
- `userId` (string): The owner of the trade.
- `source` ("manual" | "bot"): Identifies the origin of the trade.
- `botName` (string): e.g., "NewsTrader V1".
- `accountType` ("demo" | "live" | "prop"): Trading environment.
- `broker` (string): e.g., "IC Markets".
- `mt5AccountId` (string): Numeric or string account ID.
- `magicNumber` (number): MT5 magic number for strategy identification.

### Original Tracking Info (Legacy Support)
- `date` (number / string): ISO timestamp of trade creation or close.
- `pair` (string): e.g., "EURUSD". *Replaced by `symbol`.*
- `position` ("Long" | "Short" | "LONG" | "SHORT"): Trade direction.
- `outcome` ("WIN" | "LOSE" | "BREAKEVEN" | "LOSS"): Trade result.
- `pnlAmount` (number): Profit/loss in account currency. *Fallbacks to `netPnl`.*
- `pnlPercentage` (number): Used for display and equity compounding.

### New Trading Info (Recommended)
- `symbol` (string): Precise MT5 trading symbol. e.g., "XAUUSD".
- `direction` ("LONG" | "SHORT"): Caps string for direction.
- `openTime` (string): ISO timestamp of entry.
- `closeTime` (string): ISO timestamp of exit.
- `closeReason` ("TP" | "SL" | "MANUAL" | "BOT_LOGIC"): Why the trade closed.
- `volume` (number): Lot size (e.g., `0.5`).
- `entryPrice` (number): Fill price.
- `closePrice` (number): Exit fill price. *(Replacing `exitPrice`)*
- `stopLoss` (number): Final or initial SL.
- `takeProfit` (number): Final or initial TP.
- `strategyName` (string): Preferred string over legacy `strategy`.

### PnL Calculation Precedence
The dashboard displays PnL by falling back through the fields based on precision:
1. `netPnl` (number): The final credited amount (Gross - Comms +/- Swap).
2. `grossPnl` (number): The raw trade profit.
3. `pnlAmount` (number): The legacy user-entered PnL.

- `commission` (number): Associated cost.
- `swap` (number): Associated cost.
- `accountCurrency` (string): E.g., "USD".

### Risk/Reward
- `estimatedRisk` (number): PnL at risk if SL hit.
- `estimatedReward` (number): PnL if TP hit.
- `rrRatio` (number): Reward/Risk multiple.

### Images & Screenshots
The application falls back gracefully across different screenshot references, prioritizing outcome screenshots.

1. `outcomeScreenshotUrl`: Resulting chart image (Highest priority).
2. `rrChartUrl`: Initial risk/reward setup chart.
3. `imageUrl`: Legacy user-attached image.

*Metadata fields:*
- `outcomeScreenshotSource` (string): "python_script" or "mt5_chart".
- `outcomeScreenshotStatus` ("pending" | "success" | "failed"): Used for rendering loading/error states in the UI.

## Summary

This schema ensures strong backward compatibility with existing entries while laying a structured foundation for automated recording. 
By utilizing the deterministic `id` strategy, your bot infrastructure guarantees idempotency.
