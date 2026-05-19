import React, { createContext, useContext, useEffect, useState } from "react";

export type CurrencyCode = "USD" | "SGD" | "EUR" | "GBP";

export const CURRENCIES: { code: CurrencyCode; symbol: string }[] = [
  { code: "USD", symbol: "$" },
  { code: "SGD", symbol: "S$" },
  { code: "EUR", symbol: "€" },
  { code: "GBP", symbol: "£" },
];

const STORAGE_KEY = "tj:currency";

function symbolFor(code: CurrencyCode): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? "$";
}

function readStored(): CurrencyCode {
  const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
  if (raw === "USD" || raw === "SGD" || raw === "EUR" || raw === "GBP") return raw;
  return "USD";
}

interface CurrencyContextType {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  symbol: string;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: "USD",
  setCurrency: () => {},
  symbol: "$",
});

export const CurrencyProvider = ({ children }: { children: React.ReactNode }) => {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => readStored());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, currency);
  }, [currency]);

  const setCurrency = (c: CurrencyCode) => setCurrencyState(c);

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, symbol: symbolFor(currency) }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => useContext(CurrencyContext);
