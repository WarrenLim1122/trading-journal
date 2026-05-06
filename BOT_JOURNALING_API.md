# Bot Journaling Integration Guide

This guide is designed for developers connecting an MT5 execution bot or a back-office Python script to the Trading Journal.

## Architecture Guidelines

**DO NOT rely on browser automation (Selenium/Puppeteer).**
The dashboard interface is meant only for viewing the data. Data synchronization should happen directly against the Firestore REST API or via the Firebase Admin SDK.

**Flow of a Trade:**
1. Bot executes the trade and generates closing logic (TP/SL/Manual).
2. Bot triggers chart export in MT5 (e.g., using `ChartScreenShot`).
3. Bot (or Python service) uploads the capture to Firebase Storage or AWS S3 to receive a public URL.
4. Bot uses Firebase Admin SDK to write the record to Firestore.

## Database Path Target

You will target:
`/databases/{databaseId}/documents/users/{userId}/trades/{tradeId}`

## Best Practices

**1. Deterministic Trade IDs**
Never let Firestore auto-generate the document ID for bot trades. Construct the ID from the execution provider so identical requests don't duplicate trades.
Example: `doc_id = f"{account_type}_{mt5_account}_{ticket_id}"`

**2. State Management for Screenshots**
Screenshot capturing might fail or be delayed. If you write the trade before the screenshot is uploaded, ensure you mark the state explicitly:
```json
{
  "outcomeScreenshotStatus": "pending"
}
```
Update it to `success` when writing the URL. The dashboard is configured to render fallback empty states if the screenshot is `"failed"` or `"pending"`.

**3. The JSON Payload**

Below is a recommended minimal payload for a new logged trade:

```json
{
  "userId": "TARGET_USER_UUID",
  "source": "bot",
  "botName": "GoldRush V1",
  "accountType": "live",
  "mt5AccountId": "10029312",
  "symbol": "XAUUSD",
  "direction": "LONG",
  "outcome": "WIN",
  "openTime": "2024-03-01T15:30:00Z",
  "closeTime": "2024-03-01T16:15:20Z",
  "closeReason": "TP",
  "volume": 2.5,
  "entryPrice": 2040.50,
  "closePrice": 2045.20,
  "stopLoss": 2035.00,
  "takeProfit": 2045.20,
  "grossPnl": 1175.00,
  "commission": -15.00,
  "swap": 0,
  "netPnl": 1160.00,
  "rrRatio": 0.85,
  "strategyName": "Breakout Momentum",
  "tags": ["gold", "ny_session"],
  "outcomeScreenshotStatus": "success",
  "outcomeScreenshotUrl": "https://storage.googleapis.com/.../screenshot.png"
}
```

## Dashboard Calculations
The dashboard processes PnL with strong fallback precedence to handle incomplete schemas. Please provide `netPnl` to correctly reflect trading fees. If `netPnl` is excluded, `grossPnl` will be used to generate equity curves.
