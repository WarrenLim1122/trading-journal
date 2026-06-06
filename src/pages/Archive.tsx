import React, { useEffect, useMemo, useRef, useState } from "react";
import { Archive as ArchiveIcon, Filter, Download } from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useAuth } from "@journal/contexts/AuthContext";
import { useCurrency } from "@journal/contexts/CurrencyContext";
import { CurrencyToggle } from "@journal/components/layout/CurrencyToggle";
import { tradeService } from "@journal/lib/tradeService";
import { ARCHIVE_PHASE_ID } from "@journal/lib/propPhaseService";
import { Trade } from "@journal/types/trade";
import { Button } from "@journal/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@journal/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@journal/components/ui/dropdown-menu";
import { ListOverview } from "@journal/components/dashboard/ListOverview";
import { ChartOverview } from "@journal/components/dashboard/ChartOverview";
import { CalendarView } from "@journal/components/dashboard/CalendarView";
import { WinsVsLosses } from "@journal/components/dashboard/WinsVsLosses";
import { EquityCurve } from "@journal/components/dashboard/EquityCurve";
import { TradeDetailDialog } from "@journal/components/dashboard/TradeDetailDialog";
import {
  getTradeDate, getTradePnl, getTradeSymbol, getTradeDirection,
  getTradeOutcome, getTradeDisplayOutcome, getTradeAccount, getTradeStrategy,
} from "@journal/lib/tradeUtils";

// The Archive holds trades that were moved out of a deleted prop-firm folder
// (testing / demo / no-longer-useful data). It mimics the Dashboard from the
// chart overview down to the equity curve, but reads only archived trades
// (propPhaseId === ARCHIVE_PHASE_ID) so they never affect active metrics.
export function Archive() {
  const { user } = useAuth();
  const { currency, symbol: currencySymbol } = useCurrency();

  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("charts");

  const [filterPair, setFilterPair] = useState("");
  const [filterOutcome, setFilterOutcome] = useState("ALL");
  const [filterPosition, setFilterPosition] = useState("ALL");
  const [filterStrategy, setFilterStrategy] = useState("ALL");
  const [filterAccount, setFilterAccount] = useState("ALL");
  const [sortKey, setSortKey] = useState<keyof Trade>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedChartId, setSelectedChartId] = useState<string | null>(null);
  const [highlightedChartId, setHighlightedChartId] = useState<string | null>(null);
  const [selectedTradeForDetail, setSelectedTradeForDetail] = useState<Trade | null>(null);

  const chartsRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const winsRef = useRef<HTMLDivElement>(null);
  const equityRef = useRef<HTMLDivElement>(null);

  const refreshAll = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const t = await tradeService.getTrades(user.uid);
      setTrades(t);
    } catch (e) {
      console.error("Failed to fetch archive:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const archiveTrades = useMemo(
    () => trades.filter((t) => t.propPhaseId === ARCHIVE_PHASE_ID),
    [trades],
  );

  const filteredTrades = useMemo(() => {
    return archiveTrades
      .filter((t) => (filterAccount === "ALL" || getTradeAccount(t) === filterAccount))
      .filter((t) => (filterOutcome === "ALL" || t.outcome === filterOutcome))
      .filter((t) => (filterPosition === "ALL" || t.position === filterPosition))
      .filter((t) => (filterStrategy === "ALL" || getTradeStrategy(t) === filterStrategy))
      .filter((t) => (!filterPair || (t.pair && t.pair.toLowerCase().includes(filterPair.toLowerCase()))))
      .sort((a, b) => {
        let aVal: any = a[sortKey];
        let bVal: any = b[sortKey];
        if (sortKey === "date") {
          aVal = new Date(getTradeDate(a)).getTime();
          bVal = new Date(getTradeDate(b)).getTime();
        } else if (sortKey === "pair") {
          aVal = (getTradeSymbol(a) || "").toLowerCase();
          bVal = (getTradeSymbol(b) || "").toLowerCase();
        } else if (sortKey === "strategy") {
          aVal = getTradeStrategy(a).toLowerCase();
          bVal = getTradeStrategy(b).toLowerCase();
        }
        if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
  }, [archiveTrades, filterAccount, filterPair, filterOutcome, filterPosition, filterStrategy, sortKey, sortDirection]);

  useEffect(() => {
    if (filterOutcome !== "ALL" && !archiveTrades.some((t) => t.outcome === filterOutcome)) setFilterOutcome("ALL");
    if (filterPosition !== "ALL" && !archiveTrades.some((t) => t.position === filterPosition)) setFilterPosition("ALL");
    if (filterStrategy !== "ALL" && !archiveTrades.some((t) => getTradeStrategy(t) === filterStrategy)) setFilterStrategy("ALL");
  }, [archiveTrades, filterOutcome, filterPosition, filterStrategy]);

  const updateWithScrollRestoration = (updateFn: () => void) => {
    let refToAnchor: React.RefObject<HTMLDivElement> | null = null;
    if (activeSection === "list") refToAnchor = listRef;
    else if (activeSection === "charts") refToAnchor = chartsRef;
    else if (activeSection === "calendar") refToAnchor = calendarRef;
    else if (activeSection === "wins") refToAnchor = winsRef;

    const offsetBefore = refToAnchor?.current?.getBoundingClientRect().top;
    updateFn();
    if (refToAnchor && offsetBefore !== undefined) {
      setTimeout(() => {
        const offsetAfter = refToAnchor?.current?.getBoundingClientRect().top;
        if (offsetAfter !== undefined) window.scrollBy(0, offsetAfter - offsetBefore);
      }, 0);
    }
  };

  const toggleSort = (key: keyof Trade) => {
    updateWithScrollRestoration(() => {
      if (sortKey === key) setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      else { setSortKey(key); setSortDirection("desc"); }
    });
  };

  // ── Export (CSV / XLSX / PDF) — operates on the filtered archive trades ─────
  const exportRows = () =>
    filteredTrades.map((t) => {
      let parsedDate = new Date();
      try { const d = getTradeDate(t); if (d) parsedDate = new Date(d); } catch (e) { /* keep now */ }
      const pnlValue = getTradePnl(t);
      return {
        parsedDate,
        cols: [
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
          (t.notes || "").replace(/"/g, '""'),
        ],
      };
    });

  const exportName = (ext: string) => `archive_trades_${format(new Date(), "yyyyMMdd")}.${ext}`;

  const downloadCSV = () => {
    if (filteredTrades.length === 0) return;
    const headers = ["Symbol", "Date", "Time", "Type", "Outcome", "Lot Size", "Price", "SL", "TP", `PnL (${currency})`, "Notes"];
    const rows = exportRows().map((r) => r.cols);
    const csv = [headers.join(","), ...rows.map((r) => r.map((x) => `"${x}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = exportName("csv");
    link.click();
  };

  const downloadXLSX = () => {
    if (filteredTrades.length === 0) return;
    const headers = ["Symbol", "Date", "Time", "Type", "Outcome", "Lot Size", "Price", "SL", "TP", `PnL (${currency})`, "Notes"];
    const rows = exportRows().map((r) => r.cols);
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Archive");
    XLSX.writeFile(workbook, exportName("xlsx"));
  };

  const downloadPDF = () => {
    if (filteredTrades.length === 0) return;
    const doc = new jsPDF("landscape");
    const headers = [["Symbol", "Date", "Time", "Type", "Outcome", "Lot Size", "Price", "SL", "TP", `PnL (${currency})`]];
    const rows = exportRows().map((r) => {
      const pnlValue = r.cols[9];
      const pnlNum = typeof pnlValue === "number" ? pnlValue : 0;
      return [
        ...r.cols.slice(0, 9).map((x) => (x === "" ? "" : String(x))),
        pnlValue !== "" ? `${pnlNum < 0 ? "-" : ""}${currencySymbol}${Math.abs(pnlNum).toFixed(2)}` : "",
      ];
    });
    autoTable(doc, { head: headers, body: rows, theme: "grid", styles: { fontSize: 8 }, headStyles: { fillColor: [40, 40, 40] } });
    doc.save(exportName("pdf"));
  };

  useEffect(() => {
    const handleScroll = () => {
      const getPos = (ref: React.RefObject<HTMLDivElement>) =>
        ref.current ? ref.current.getBoundingClientRect().top : Infinity;

      const offset = 200;
      const equityPos = getPos(equityRef);
      const winsPos = getPos(winsRef);
      const calendarPos = getPos(calendarRef);
      const listPos = getPos(listRef);
      const chartsPos = getPos(chartsRef);

      if (equityPos <= offset) setActiveSection("equity");
      else if (winsPos <= offset) setActiveSection("wins");
      else if (calendarPos <= offset) setActiveSection("calendar");
      else if (listPos <= offset) setActiveSection("list");
      else if (chartsPos <= offset) setActiveSection("charts");
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: "smooth" });
  };

  const totalPnl = useMemo(
    () => archiveTrades.reduce((s, t) => s + getTradePnl(t), 0),
    [archiveTrades],
  );

  return (
    <div className="mx-auto max-w-7xl relative pb-24">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div className="flex flex-col">
          <h1 className="text-3xl font-bold font-mono tracking-tight text-white flex items-center gap-2">
            <ArchiveIcon className="h-6 w-6 text-primary" />
            Archive
          </h1>
          <p className="text-muted-foreground mt-2">
            Trades moved here from deleted prop-firm folders (testing / demo / retired data).
            They never affect your active Dashboard metrics.
          </p>
        </div>
        <CurrencyToggle />
      </header>

      {loading ? (
        <div className="flex w-full items-center justify-center p-12">
          <p className="text-muted-foreground animate-pulse">Loading archive...</p>
        </div>
      ) : (
        <div className="flex flex-col gap-12">
          <div className="sticky top-0 z-50 bg-background/90 backdrop-blur-md py-4 border-b border-border flex flex-col gap-4 w-full">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 flex-1 min-w-0">
                <Button variant={activeSection === "charts" ? "default" : "ghost"} size="sm" onClick={() => scrollTo(chartsRef)}>Chart overview</Button>
                <Button variant={activeSection === "list" ? "default" : "ghost"} size="sm" onClick={() => scrollTo(listRef)}>List overview</Button>
                <Button variant={activeSection === "calendar" ? "default" : "ghost"} size="sm" onClick={() => scrollTo(calendarRef)}>Calendar</Button>
                <Button variant={activeSection === "wins" ? "default" : "ghost"} size="sm" onClick={() => scrollTo(winsRef)}>Win Vs Lose</Button>
                <Button variant={activeSection === "equity" ? "default" : "ghost"} size="sm" onClick={() => scrollTo(equityRef)}>Equity Curve</Button>
              </div>
              <span className="text-xs font-mono text-muted-foreground shrink-0">
                {archiveTrades.length} archived · Total P&amp;L{" "}
                <span className={totalPnl >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}>
                  {totalPnl < 0 ? "-" : "+"}{currencySymbol}{Math.abs(totalPnl).toFixed(2)}
                </span>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Filter size={16} />
                <span className="text-xs font-mono uppercase font-semibold">Filter:</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/60 pl-0.5">Account</span>
                <Select value={filterAccount} onValueChange={(val) => updateWithScrollRestoration(() => setFilterAccount(val))}>
                  <SelectTrigger className="h-8 w-[130px] bg-black/40 text-xs font-mono"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Accounts</SelectItem>
                    <SelectItem value="personal">Personal (SGD)</SelectItem>
                    <SelectItem value="prop">Prop (USD)</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/60 pl-0.5">Symbol</span>
                <Select value={filterPair || "ALL"} onValueChange={(val) => updateWithScrollRestoration(() => setFilterPair(val === "ALL" ? "" : val))}>
                  <SelectTrigger className="h-8 w-[130px] bg-black/40 text-xs font-mono"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Symbols</SelectItem>
                    {Array.from(new Set(archiveTrades.map((t) => t.pair?.toUpperCase()))).filter(Boolean).map((pair) => (
                      <SelectItem key={pair} value={pair as string}>{pair}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/60 pl-0.5">Outcome</span>
                <Select value={filterOutcome} onValueChange={(val) => updateWithScrollRestoration(() => setFilterOutcome(val))}>
                  <SelectTrigger className="h-8 w-[120px] bg-black/40 text-xs font-mono"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Outcomes</SelectItem>
                    {Array.from(new Set(archiveTrades.map((t) => t.outcome))).filter(Boolean).map((outcome) => (
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
                  <SelectTrigger className="h-8 w-[120px] bg-black/40 text-xs font-mono"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Directions</SelectItem>
                    {Array.from(new Set(archiveTrades.map((t) => t.position))).filter(Boolean).map((position) => (
                      <SelectItem key={position} value={position}>{position}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/60 pl-0.5">Strategy</span>
                <Select value={filterStrategy} onValueChange={(val) => updateWithScrollRestoration(() => setFilterStrategy(val))}>
                  <SelectTrigger className="h-8 w-[120px] bg-black/40 text-xs font-mono"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Strategies</SelectItem>
                    {Array.from(new Set(archiveTrades.map((t) => getTradeStrategy(t)))).filter(Boolean).map((strategy) => (
                      <SelectItem key={strategy} value={strategy}>{strategy}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div ref={chartsRef} className="scroll-mt-40">
            <h2 className="text-4xl font-extrabold font-mono mb-8 text-white tracking-[0.2em] uppercase border-b border-border/50 pb-4">Chart Overview</h2>
            <ChartOverview
              trades={filteredTrades}
              startBalance={0}
              selectedChartId={selectedChartId}
              onOpenChart={setSelectedChartId}
              onCloseChart={() => setSelectedChartId(null)}
              highlightedChartId={highlightedChartId}
              onClearHighlight={() => { if (highlightedChartId) setHighlightedChartId(null); }}
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
                  <DropdownMenuItem onClick={downloadCSV} className="font-mono cursor-pointer whitespace-nowrap">Export as .csv file</DropdownMenuItem>
                  <DropdownMenuItem onClick={downloadXLSX} className="font-mono cursor-pointer whitespace-nowrap">Export as .xlsx file</DropdownMenuItem>
                  <DropdownMenuItem onClick={downloadPDF} className="font-mono cursor-pointer whitespace-nowrap">Export as .pdf file</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <ListOverview
              trades={filteredTrades}
              onTradeDeleted={refreshAll}
              onTradesChanged={refreshAll}
              onRowClick={(id) => {
                const t = filteredTrades.find((trade) => trade.id === id);
                if (t) setSelectedTradeForDetail(t);
              }}
              sortKey={sortKey}
              sortDirection={sortDirection}
              onSort={toggleSort}
            />
          </div>

          <div ref={calendarRef} className="scroll-mt-40">
            <h2 className="text-4xl font-extrabold font-mono mb-8 text-white tracking-[0.2em] uppercase border-b border-border/50 pb-4">Calendar</h2>
            <CalendarView trades={filteredTrades} startBalance={0} onTradeClick={(t) => setSelectedTradeForDetail(t)} />
          </div>

          <div ref={winsRef} className="scroll-mt-40">
            <h2 className="text-4xl font-extrabold font-mono mb-8 text-white tracking-[0.2em] uppercase border-b border-border/50 pb-4">Win Vs Lose</h2>
            <WinsVsLosses trades={filteredTrades} />
          </div>

          <div ref={equityRef} className="scroll-mt-40">
            <h2 className="text-4xl font-extrabold font-mono mb-8 text-white tracking-[0.2em] uppercase border-b border-border/50 pb-4">Equity Curve</h2>
            <EquityCurve trades={filteredTrades} startingBalance="0" readOnlyStartBalance />
          </div>

          <TradeDetailDialog
            trade={selectedTradeForDetail}
            open={!!selectedTradeForDetail}
            onOpenChange={(open) => { if (!open) setSelectedTradeForDetail(null); }}
          />
        </div>
      )}
    </div>
  );
}
