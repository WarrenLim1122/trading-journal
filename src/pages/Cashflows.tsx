import React from "react";
import { CashflowManager } from "@journal/components/cashflows/CashflowManager";

export function Cashflows() {
  return (
    <div className="mx-auto max-w-5xl">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-black font-mono tracking-tighter text-white">Cashflows</h1>
          <p className="text-sm text-muted-foreground font-mono mt-1">
            Manually log deposits and withdrawals on your trading account.
          </p>
        </div>
      </header>
      <CashflowManager />
    </div>
  );
}
