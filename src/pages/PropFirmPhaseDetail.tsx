import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, Link, Navigate } from "react-router-dom";
import { ArrowLeft, Wallet } from "lucide-react";
import { useAuth } from "@journal/contexts/AuthContext";
import { CurrencyToggle } from "@journal/components/layout/CurrencyToggle";
import { propPhaseService } from "@journal/lib/propPhaseService";
import { tradeService } from "@journal/lib/tradeService";
import { cashflowService } from "@journal/lib/cashflowService";
import { PropPhase } from "@journal/types/propPhase";
import { Trade } from "@journal/types/trade";
import { Cashflow } from "@journal/types/cashflow";
import { Button } from "@journal/components/ui/button";
import { ListOverview } from "@journal/components/dashboard/ListOverview";
import { ChartOverview } from "@journal/components/dashboard/ChartOverview";
import { CalendarView } from "@journal/components/dashboard/CalendarView";
import { WinsVsLosses } from "@journal/components/dashboard/WinsVsLosses";
import { EquityCurve } from "@journal/components/dashboard/EquityCurve";
import { TradeDetailDialog } from "@journal/components/dashboard/TradeDetailDialog";
import { PhaseMetadataBar } from "@journal/components/propfirm/PhaseMetadataBar";
import { EditPhaseMetadataDialog } from "@journal/components/propfirm/EditPhaseMetadataDialog";
import { DeletePhaseDialog } from "@journal/components/propfirm/DeletePhaseDialog";

export function PropFirmPhaseDetail() {
  const { user } = useAuth();
  const { phaseId } = useParams<{ phaseId: string }>();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<PropPhase | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [cashflows, setCashflows] = useState<Cashflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeSection, setActiveSection] = useState("charts");

  const [selectedTradeForDetail, setSelectedTradeForDetail] = useState<Trade | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Refs for scroll-anchored tab nav.
  const chartsRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const winsRef = useRef<HTMLDivElement>(null);
  const equityRef = useRef<HTMLDivElement>(null);

  const refreshAll = async () => {
    if (!user || !phaseId) return;
    setLoading(true);
    try {
      const [p, t, c] = await Promise.all([
        propPhaseService.getPhase(user.uid, phaseId),
        tradeService.getTrades(user.uid),
        cashflowService.getCashflows(user.uid),
      ]);
      if (!p) {
        setNotFound(true);
        setPhase(null);
      } else {
        setPhase(p);
        setNotFound(false);
      }
      setTrades(t);
      setCashflows(c);
    } catch (e) {
      // Read failures fail soft so the UI never hangs.
      console.error("Failed to fetch phase detail:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, phaseId]);

  const phaseTrades = useMemo(
    () => trades.filter((t) => t.propPhaseId === phaseId),
    [trades, phaseId],
  );
  const phaseCashflows = useMemo(
    () => cashflows.filter((c) => c.propPhaseId === phaseId),
    [cashflows, phaseId],
  );

  // Scroll-anchored active tab indicator (mirrors Dashboard's pattern).
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

  if (notFound) {
    return <Navigate to="/journal/prop-firm" replace />;
  }

  return (
    <div className="mx-auto max-w-7xl relative pb-24">
      {/* Back link + currency toggle */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <Link
          to="/journal/prop-firm"
          className="inline-flex items-center gap-1 text-sm font-mono text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} /> Back to PropFirm Journal
        </Link>
        <div className="flex items-center gap-3">
          <CurrencyToggle />
        </div>
      </div>

      {loading || !phase ? (
        <div className="flex w-full items-center justify-center p-12">
          <p className="text-muted-foreground animate-pulse">Loading phase...</p>
        </div>
      ) : (
        <>
          <PhaseMetadataBar
            phase={phase}
            onEdit={() => setEditOpen(true)}
            onDelete={() => setDeleteOpen(true)}
          />

          <div className="flex flex-col gap-12">
            {/* Sticky tab nav — mirrors Dashboard's pattern, minus filter bar. */}
            <div className="sticky top-0 z-50 bg-background/90 backdrop-blur-md py-4 border-b border-border flex flex-col gap-4 w-full">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 flex-1 min-w-0">
                  <Button variant={activeSection === "charts" ? "default" : "ghost"} size="sm" onClick={() => scrollTo(chartsRef)}>Chart overview</Button>
                  <Button variant={activeSection === "list" ? "default" : "ghost"} size="sm" onClick={() => scrollTo(listRef)}>List overview</Button>
                  <Button variant={activeSection === "calendar" ? "default" : "ghost"} size="sm" onClick={() => scrollTo(calendarRef)}>Calendar</Button>
                  <Button variant={activeSection === "wins" ? "default" : "ghost"} size="sm" onClick={() => scrollTo(winsRef)}>Win Vs Lose</Button>
                  <Button variant={activeSection === "equity" ? "default" : "ghost"} size="sm" onClick={() => scrollTo(equityRef)}>Equity Curve</Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="font-mono gap-2 shrink-0"
                  onClick={() => alert("Cashflow management for this phase lands in Task F.")}
                  title="Cashflow management for this phase lands in Task F"
                >
                  <Wallet size={14} /> Manage cashflows
                </Button>
              </div>
            </div>

            <div ref={chartsRef} className="scroll-mt-40">
              <h2 className="text-4xl font-extrabold font-mono mb-8 text-white tracking-[0.2em] uppercase border-b border-border/50 pb-4">Chart Overview</h2>
              <ChartOverview
                trades={phaseTrades}
                startBalance={phase.startingBalance}
              />
            </div>

            <div ref={listRef} className="scroll-mt-40">
              <h2 className="text-4xl font-extrabold font-mono mb-8 text-white tracking-[0.2em] uppercase border-b border-border/50 pb-4">List Overview</h2>
              <ListOverview
                trades={phaseTrades}
                onTradeDeleted={() => {}}
                onRowClick={(id) => {
                  const t = phaseTrades.find((trade) => trade.id === id);
                  if (t) setSelectedTradeForDetail(t);
                }}
                readOnly
              />
            </div>

            <div ref={calendarRef} className="scroll-mt-40">
              <h2 className="text-4xl font-extrabold font-mono mb-8 text-white tracking-[0.2em] uppercase border-b border-border/50 pb-4">Calendar</h2>
              <CalendarView
                trades={phaseTrades}
                startBalance={phase.startingBalance}
                onTradeClick={(t) => setSelectedTradeForDetail(t)}
              />
            </div>

            <div ref={winsRef} className="scroll-mt-40">
              <h2 className="text-4xl font-extrabold font-mono mb-8 text-white tracking-[0.2em] uppercase border-b border-border/50 pb-4">Win Vs Lose</h2>
              <WinsVsLosses trades={phaseTrades} />
            </div>

            <div ref={equityRef} className="scroll-mt-40">
              <h2 className="text-4xl font-extrabold font-mono mb-8 text-white tracking-[0.2em] uppercase border-b border-border/50 pb-4">Equity Curve</h2>
              <EquityCurve
                trades={phaseTrades}
                startingBalance={String(phase.startingBalance)}
                setStartingBalance={() => {
                  /* read-only: phase starting balance is frozen at publish time */
                }}
              />
            </div>
          </div>

          {/* Read-only trade detail viewer for row clicks */}
          <TradeDetailDialog
            trade={selectedTradeForDetail}
            open={!!selectedTradeForDetail}
            onOpenChange={(open) => {
              if (!open) setSelectedTradeForDetail(null);
            }}
          />

          <EditPhaseMetadataDialog
            phase={phase}
            open={editOpen}
            onOpenChange={setEditOpen}
            onUpdated={refreshAll}
          />

          <DeletePhaseDialog
            phase={phase}
            tradeCount={phaseTrades.length}
            cashflowCount={phaseCashflows.length}
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            onDeleted={() => navigate("/journal/prop-firm")}
          />
        </>
      )}
    </div>
  );
}
