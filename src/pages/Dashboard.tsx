import React, { useEffect, useState, useRef, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Trade } from "../types/trade";
import { Cashflow } from "../types/cashflow";
import { tradeService } from "../lib/tradeService";
import { cashflowService } from "../lib/cashflowService";
import { ListOverview } from "../components/dashboard/ListOverview";
import { ChartOverview } from "../components/dashboard/ChartOverview";
import { WinsVsLosses } from "../components/dashboard/WinsVsLosses";
import { CalendarView } from "../components/dashboard/CalendarView";
import { EquityCurve } from "../components/dashboard/EquityCurve";
import { Filter, Download, Plus } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Link, useNavigate } from "react-router-dom";

import { TradeDetailDialog } from "../components/dashboard/TradeDetailDialog";
import { getTradeDate, getTradePnl, getTradeSymbol, getTradeDirection, getTradeOutcome, getTradeDisplayOutcome } from "../lib/tradeUtils";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [cashflows, setCashflows] = useState<Cashflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("charts");

  // Filter and Sort states
  const [filterPair, setFilterPair] = useState("");
  const [filterOutcome, setFilterOutcome] = useState("ALL");
  const [filterPosition, setFilterPosition] = useState("ALL");
  const [filterStrategy, setFilterStrategy] = useState("ALL");
  const [sortKey, setSortKey] = useState<keyof Trade>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedChartId, setSelectedChartId] = useState<string | null>(null);
  const [highlightedChartId, setHighlightedChartId] = useState<string | null>(null);
  const [selectedTradeForDetail, setSelectedTradeForDetail] = useState<Trade | null>(null);

  // Global start balance state for dynamic calculation
  const [startBalance, setStartBalance] = useState(() => localStorage.getItem("startBalance") || "1000");

  const navigate = useNavigate();

  // Refs for scrolling
  const listRef = useRef<HTMLDivElement>(null);
  const chartsRef = useRef<HTMLDivElement>(null);
  const winsRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const equityRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem("startBalance", startBalance);
  }, [startBalance]);

  useEffect(() => {
    const handleStartBalanceUpdate = () => setStartBalance(localStorage.getItem("startBalance") || "1000");
    window.addEventListener("startBalanceUpdate", handleStartBalanceUpdate);
    return () => window.removeEventListener("startBalanceUpdate", handleStartBalanceUpdate);
  }, []);

  const fetchTrades = async () => {
    if (user) {
      setLoading(true);
      const [tradesData, cashflowsData] = await Promise.all([
        tradeService.getTrades(user.uid),
        cashflowService.getCashflows(user.uid),
      ]);
      setTrades(tradesData);
      setCashflows(cashflowsData);
      setLoading(false);
    }
  };

  // Refresh equity when cashflows change on the Cashflows page.
  useEffect(() => {
    const handler = async () => {
      if (!user) return;
      const cf = await cashflowService.getCashflows(user.uid);
      setCashflows(cf);
    };
    window.addEventListener("cashflowsUpdated", handler);
    return () => window.removeEventListener("cashflowsUpdated", handler);
  }, [user]);

  const netCashflow = useMemo(() => {
    let net = 0;
    cashflows.forEach(c => {
      net += c.type === "deposit" ? c.amount : -c.amount;
    });
    return net;
  }, [cashflows]);

  const filteredTrades = useMemo(() => {
    return trades
      .filter(t => (filterOutcome === 'ALL' || t.outcome === filterOutcome))
      .filter(t => (filterPosition === 'ALL' || t.position === filterPosition))
      .filter(t => (filterStrategy === 'ALL' || t.strategy === filterStrategy))
      .filter(t => (!filterPair || (t.pair && t.pair.toLowerCase().includes(filterPair.toLowerCase()))))
      .sort((a, b) => {
        let aVal: any = a[sortKey];
        let bVal: any = b[sortKey];
        if (sortKey === 'date') {
           aVal = new Date(a.date).getTime();
           bVal = new Date(b.date).getTime();
        } else if (sortKey === 'pair') {
           aVal = (getTradeSymbol(a) || "").toLowerCase();
           bVal = (getTradeSymbol(b) || "").toLowerCase();
        }
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }, [trades, filterPair, filterOutcome, filterPosition, filterStrategy, sortKey, sortDirection]);

  const { currentEquity, equityPercentChange } = useMemo(() => {
    const startNum = parseFloat(startBalance) || 0;

    let tradingPnl = 0;
    const sortedTrades = [...filteredTrades].sort((a, b) => new Date(getTradeDate(a)).getTime() - new Date(getTradeDate(b)).getTime());
    sortedTrades.forEach(trade => {
      const pnl = getTradePnl(trade);
      const pnlAmt = pnl !== undefined
        ? pnl
        : (trade.pnlPercentage && startNum > 0 ? startNum * (trade.pnlPercentage / 100) : 0);
      tradingPnl += pnlAmt;
    });

    const balance = startNum + netCashflow + tradingPnl;
    // % change measures trading performance on capital actually invested (start + deposits − withdrawals).
    const investedCapital = startNum + netCashflow;
    const percentChange = investedCapital > 0 ? (tradingPnl / investedCapital) * 100 : 0;

    return { currentEquity: balance, equityPercentChange: percentChange };
  }, [filteredTrades, startBalance, netCashflow]);

  const downloadCSV = () => {
    if (filteredTrades.length === 0) return;

    const headers = ["Symbol", "Date", "Time", "Type", "Outcome", "Lot Size", "Price", "SL", "TP", "PnL", "Notes"];
    const rows = filteredTrades.map(t => {
      let dateObjStr = getTradeDate(t);
      let parsedDate = new Date();
      try { if (dateObjStr) parsedDate = new Date(dateObjStr); } catch(e) {}

      const formattedDate = format(parsedDate, "yyyy-MM-dd");
      const formattedTime = format(parsedDate, "HH:mm");
      const pnlValue = getTradePnl(t);
      return [
        getTradeSymbol(t) || "",
        formattedDate,
        formattedTime,
        getTradeDirection(t) || t.position,
        getTradeDisplayOutcome(t) || t.outcome,
        t.volume !== undefined ? t.volume : "",
        t.entryPrice !== undefined ? t.entryPrice : "",
        t.stopLoss !== undefined ? t.stopLoss : "",
        t.takeProfit !== undefined ? t.takeProfit : "",
        pnlValue !== undefined ? pnlValue : "",
        (t.notes || "").replace(/"/g, '""')
      ];
    });

    const csvContent = [headers.join(","), ...rows.map(r => r.map(x => `"${x}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `trades_export_${format(new Date(), "yyyyMMdd")}.csv`;
    link.click();
  };

  const downloadXLSX = () => {
    if (filteredTrades.length === 0) return;

    const headers = ["Symbol", "Date", "Time", "Type", "Outcome", "Lot Size", "Price", "SL", "TP", "PnL", "Notes"];
    const rows = filteredTrades.map(t => {
      let dateObjStr = getTradeDate(t);
      let parsedDate = new Date();
      try { if (dateObjStr) parsedDate = new Date(dateObjStr); } catch(e) {}

      const pnlValue = getTradePnl(t);

      return [
        getTradeSymbol(t) || "",
        format(parsedDate, "yyyy-MM-dd"),
        format(parsedDate, "HH:mm"),
        getTradeDirection(t) || t.position,
        getTradeDisplayOutcome(t) || t.outcome,
        t.volume !== undefined ? t.volume : "",
        t.entryPrice !== undefined ? t.entryPrice : "",
        t.stopLoss !== undefined ? t.stopLoss : "",
        t.takeProfit !== undefined ? t.takeProfit : "",
        pnlValue !== undefined ? pnlValue : "",
        (t.notes || "")
      ];
    });

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Trades");
    XLSX.writeFile(workbook, `trades_export_${format(new Date(), "yyyyMMdd")}.xlsx`);
  };

  const downloadPDF = () => {
    if (filteredTrades.length === 0) return;

    const doc = new jsPDF("landscape");
    const headers = [["Symbol", "Date", "Time", "Type", "Outcome", "Lot Size", "Price", "SL", "TP", "PnL"]];
    const rows = filteredTrades.map(t => {
      let dateObjStr = getTradeDate(t);
      let parsedDate = new Date();
      try { if (dateObjStr) parsedDate = new Date(dateObjStr); } catch(e) {}

      const pnlValue = getTradePnl(t);

      return [
        getTradeSymbol(t) || "",
        format(parsedDate, "yyyy-MM-dd"),
        format(parsedDate, "HH:mm"),
        getTradeDirection(t) || t.position,
        getTradeDisplayOutcome(t) || t.outcome,
        t.volume !== undefined ? t.volume.toString() : "",
        t.entryPrice !== undefined ? t.entryPrice.toString() : "",
        t.stopLoss !== undefined ? t.stopLoss.toString() : "",
        t.takeProfit !== undefined ? t.takeProfit.toString() : "",
        pnlValue !== undefined ? `$${pnlValue.toFixed(2)}` : ""
      ];
    });

    autoTable(doc, {
      head: headers,
      body: rows,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [40, 40, 40] }
    });

    doc.save(`trades_export_${format(new Date(), "yyyyMMdd")}.pdf`);
  };

  const updateWithScrollRestoration = (updateFn: () => void) => {
    let refToAnchor: React.RefObject<HTMLDivElement> | null = null;
    if (activeSection === 'list') refToAnchor = listRef;
    else if (activeSection === 'charts') refToAnchor = chartsRef;
    else if (activeSection === 'calendar') refToAnchor = calendarRef;
    else if (activeSection === 'wins') refToAnchor = winsRef;

    const offsetBefore = refToAnchor?.current?.getBoundingClientRect().top;

    updateFn();

    if (refToAnchor && offsetBefore !== undefined) {
      setTimeout(() => {
         const offsetAfter = refToAnchor?.current?.getBoundingClientRect().top;
         if (offsetAfter !== undefined) {
            window.scrollBy(0, offsetAfter - offsetBefore);
         }
      }, 0);
    }
  };

  const toggleSort = (key: keyof Trade) => {
    updateWithScrollRestoration(() => {
      if (sortKey === key) {
        setSortDirection(prev => prev === "asc" ? "desc" : "asc");
      } else {
        setSortKey(key);
        setSortDirection("desc");
      }
    });
  };

  useEffect(() => {
    fetchTrades();
  }, [user]);

  useEffect(() => {
    if (filterOutcome !== 'ALL') {
      const availableOutcomes = Array.from(new Set(trades.map(t => t.outcome))).filter(Boolean);
      if (!availableOutcomes.includes(filterOutcome as any)) {
        setFilterOutcome('ALL');
      }
    }
    if (filterPosition !== 'ALL') {
      const availablePositions = Array.from(new Set(trades.map(t => t.position))).filter(Boolean);
      if (!availablePositions.includes(filterPosition as any)) {
        setFilterPosition('ALL');
      }
    }
    if (filterStrategy !== 'ALL') {
      const availableStrategies = Array.from(new Set(trades.map(t => t.strategy))).filter(Boolean);
      if (!availableStrategies.includes(filterStrategy)) {
        setFilterStrategy('ALL');
      }
    }
  }, [trades, filterOutcome, filterPosition, filterStrategy]);

  useEffect(() => {
    const handleScroll = () => {
      const getPos = (ref: React.RefObject<HTMLDivElement>) => {
        return ref.current ? ref.current.getBoundingClientRect().top : Infinity;
      };

      const offset = 200;

      const equityPos = getPos(equityRef);
      const winsPos = getPos(winsRef);
      const calendarPos = getPos(calendarRef);
      const listPos = getPos(listRef);
      const chartsPos = getPos(chartsRef);

      if (equityPos <= offset) {
        setActiveSection("equity");
      } else if (winsPos <= offset) {
        setActiveSection("wins");
      } else if (calendarPos <= offset) {
        setActiveSection("calendar");
      } else if (listPos <= offset) {
        setActiveSection("list");
      } else if (chartsPos <= offset) {
        setActiveSection("charts");
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="mx-auto max-w-7xl relative">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div className="flex flex-col">
            <span className="text-sm font-mono text-muted-foreground uppercase tracking-wider">Current Equity</span>
            <div className="flex items-baseline gap-3 flex-wrap">
              <h1 className="text-4xl font-black font-mono tracking-tighter text-white">
                ${currentEquity.toFixed(2)}
              </h1>
              <span className={`text-sm font-mono font-bold ${equityPercentChange >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                 {equityPercentChange >= 0 ? '+' : ''}{equityPercentChange.toFixed(2)}%
              </span>
              {netCashflow !== 0 && (
                <Link
                  to="/journal/cashflows"
                  className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border transition-colors ${
                    netCashflow >= 0
                      ? "border-[#22c55e]/40 text-[#22c55e] hover:bg-[#22c55e]/10"
                      : "border-[#ef4444]/40 text-[#ef4444] hover:bg-[#ef4444]/10"
                  }`}
                  title="Click to manage deposits and withdrawals"
                >
                  Net cashflow {netCashflow >= 0 ? "+" : "−"}${Math.abs(netCashflow).toFixed(2)}
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 relative z-50">
             <Button className="gap-2 shrink-0 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 font-mono transition-all hover:scale-105" onClick={() => navigate("/journal/new-trade")}>
               <Plus size={16} /> New Trade
             </Button>
          </div>
        </header>

        {loading ? (
          <div className="flex w-full items-center justify-center p-12">
             <p className="text-muted-foreground animate-pulse">Loading journal...</p>
          </div>
        ) : (
          <div className="flex flex-col gap-12 pb-24">
            <div className="sticky top-0 z-50 bg-background/90 backdrop-blur-md py-4 border-b border-border flex flex-col gap-4 w-full">
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 border-b border-border/50">
                 <Button variant={activeSection === "charts" ? "default" : "ghost"} size="sm" onClick={() => scrollTo(chartsRef)}>Chart overview</Button>
                 <Button variant={activeSection === "list" ? "default" : "ghost"} size="sm" onClick={() => scrollTo(listRef)}>List overview</Button>
                 <Button variant={activeSection === "calendar" ? "default" : "ghost"} size="sm" onClick={() => scrollTo(calendarRef)}>Calendar</Button>
                 <Button variant={activeSection === "wins" ? "default" : "ghost"} size="sm" onClick={() => scrollTo(winsRef)}>Win Vs Lose</Button>
                 <Button variant={activeSection === "equity" ? "default" : "ghost"} size="sm" onClick={() => scrollTo(equityRef)}>Equity Curve</Button>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 items-end sm:items-start justify-between">
                <div className="flex flex-wrap items-center gap-3 w-full">
                   <div className="flex items-center gap-2 text-muted-foreground">
                      <Filter size={16} />
                      <span className="text-xs font-mono uppercase font-semibold">Filter:</span>
                   </div>
                   <div className="flex flex-col gap-0.5">
                     <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/60 pl-0.5">Symbol</span>
                     <Select value={filterPair || 'ALL'} onValueChange={(val) => updateWithScrollRestoration(() => setFilterPair(val === 'ALL' ? '' : val))}>
                       <SelectTrigger className="h-8 w-[130px] bg-black/40 text-xs font-mono">
                         <SelectValue placeholder="All" />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="ALL">All Symbols</SelectItem>
                         {Array.from(new Set(trades.map(t => t.pair?.toUpperCase()))).filter(Boolean).map(pair => (
                           <SelectItem key={pair} value={pair as string}>{pair}</SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </div>
                   <div className="flex flex-col gap-0.5">
                     <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/60 pl-0.5">Outcome</span>
                     <Select value={filterOutcome} onValueChange={(val) => updateWithScrollRestoration(() => setFilterOutcome(val))}>
                       <SelectTrigger className="h-8 w-[120px] bg-black/40 text-xs font-mono">
                         <SelectValue placeholder="All" />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="ALL">All Outcomes</SelectItem>
                         {Array.from(new Set(trades.map(t => t.outcome))).filter(Boolean).map(outcome => (
                           <SelectItem key={outcome} value={outcome}>
                             {outcome === "BREAKEVEN" ? "Break Even" : outcome === "WIN" ? "Win" : "Lose"}
                           </SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </div>
                   <div className="flex flex-col gap-0.5">
                     <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/60 pl-0.5">Direction</span>
                     <Select value={filterPosition} onValueChange={(val) => updateWithScrollRestoration(() => setFilterPosition(val))}>
                       <SelectTrigger className="h-8 w-[120px] bg-black/40 text-xs font-mono">
                         <SelectValue placeholder="All" />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="ALL">All Directions</SelectItem>
                         {Array.from(new Set(trades.map(t => t.position))).filter(Boolean).map(position => (
                           <SelectItem key={position} value={position}>{position}</SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </div>
                   <div className="flex flex-col gap-0.5">
                     <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/60 pl-0.5">Strategy</span>
                     <Select value={filterStrategy} onValueChange={(val) => updateWithScrollRestoration(() => setFilterStrategy(val))}>
                       <SelectTrigger className="h-8 w-[120px] bg-black/40 text-xs font-mono">
                         <SelectValue placeholder="All" />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="ALL">All Strategies</SelectItem>
                         {Array.from(new Set(trades.map(t => t.strategy))).filter(Boolean).map(strategy => (
                           <SelectItem key={strategy as string} value={strategy as string}>{strategy}</SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </div>
                </div>
              </div>
            </div>

            <div ref={chartsRef} className="scroll-mt-40">
              <h2 className="text-4xl font-extrabold font-mono mb-8 text-white tracking-[0.2em] uppercase border-b border-border/50 pb-4">Chart Overview</h2>
              <ChartOverview
                trades={filteredTrades}
                startBalance={parseFloat(startBalance) || 1000}
                selectedChartId={selectedChartId}
                onOpenChart={setSelectedChartId}
                onCloseChart={() => setSelectedChartId(null)}
                highlightedChartId={highlightedChartId}
                onClearHighlight={() => {
                  if (highlightedChartId) setHighlightedChartId(null);
                }}
              />
            </div>

            <div ref={listRef} className="scroll-mt-40">
              <div className="flex items-center justify-between border-b border-border/50 mb-8 pb-4">
                <h2 className="text-4xl font-extrabold font-mono text-white tracking-[0.2em] uppercase">List Overview</h2>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="font-mono h-9 gap-2" />}>
                    <Download size={16} /> Export
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-background border-border min-w-[200px]">
                    <DropdownMenuItem onClick={downloadCSV} className="font-mono cursor-pointer whitespace-nowrap">
                      Export as .csv file
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={downloadXLSX} className="font-mono cursor-pointer whitespace-nowrap">
                      Export as .xlsx file
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={downloadPDF} className="font-mono cursor-pointer whitespace-nowrap">
                      Export as .pdf file
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <ListOverview
                trades={filteredTrades}
                onTradeDeleted={fetchTrades}
                onRowClick={(id) => {
                  const t = filteredTrades.find(trade => trade.id === id);
                  if (t) setSelectedTradeForDetail(t);
                }}
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSort={toggleSort}
              />
            </div>

            <div ref={calendarRef} className="scroll-mt-40">
              <h2 className="text-4xl font-extrabold font-mono mb-8 text-white tracking-[0.2em] uppercase border-b border-border/50 pb-4">Calendar</h2>
               <CalendarView trades={filteredTrades} startBalance={parseFloat(startBalance) || 1000} onTradeClick={(t) => setSelectedTradeForDetail(t)} />
            </div>

            <div ref={winsRef} className="scroll-mt-40">
              <h2 className="text-4xl font-extrabold font-mono mb-8 text-white tracking-[0.2em] uppercase border-b border-border/50 pb-4">Win Vs Lose</h2>
              <WinsVsLosses trades={filteredTrades} />
            </div>

            <div ref={equityRef} className="scroll-mt-40">
              <h2 className="text-4xl font-extrabold font-mono mb-8 text-white tracking-[0.2em] uppercase border-b border-border/50 pb-4">Equity Curve</h2>
              <EquityCurve
                trades={filteredTrades}
                startingBalance={startBalance}
                setStartingBalance={setStartBalance}
              />
            </div>
          </div>
        )}

        <TradeDetailDialog
          trade={selectedTradeForDetail}
          open={!!selectedTradeForDetail}
          onOpenChange={(open) => {
            if (!open) setSelectedTradeForDetail(null);
          }}
        />
    </div>
  );
}
