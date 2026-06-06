import React, { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { CurrencyProvider } from "./contexts/CurrencyContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import { NewTrade } from "./pages/NewTrade";
import { RiskCalculator } from "./pages/RiskCalculator";
import { StrategiesDashboard } from "./pages/StrategiesDashboard";
import { PropFirmDashboard } from "./pages/PropFirmDashboard";
import { PropFirmPhaseDetail } from "./pages/PropFirmPhaseDetail";
import { Settings } from "./pages/Settings";
import { Cashflows } from "./pages/Cashflows";
import { Archive } from "./pages/Archive";
import { AppLayout } from "./components/layout/AppLayout";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground animate-pulse font-mono">Loading...</p>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/journal/login" replace />;
  }
  return <AppLayout>{children}</AppLayout>;
}

export default function JournalApp() {
  // Adding dark to <html> ensures portal-rendered elements (dropdowns, dialogs,
  // selects, popovers) inherit dark CSS variables even though they render into
  // document.body, outside any scoped .dark div.
  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => {
      document.documentElement.classList.remove("dark");
    };
  }, []);

  return (
    <AuthProvider>
      <CurrencyProvider>
      <div className="dark">
        <Routes>
          <Route path="login" element={<Login />} />
          <Route index element={<Navigate to="/journal/dashboard" replace />} />
          <Route
            path="dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="new-trade"
            element={
              <ProtectedRoute>
                <NewTrade />
              </ProtectedRoute>
            }
          />
          <Route
            path="strategies"
            element={
              <ProtectedRoute>
                <StrategiesDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="prop-firm"
            element={
              <ProtectedRoute>
                <PropFirmDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="prop-firm/:phaseId"
            element={
              <ProtectedRoute>
                <PropFirmPhaseDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="risk-calculator"
            element={
              <ProtectedRoute>
                <RiskCalculator />
              </ProtectedRoute>
            }
          />
          <Route
            path="cashflows"
            element={
              <ProtectedRoute>
                <Cashflows />
              </ProtectedRoute>
            }
          />
          <Route
            path="archive"
            element={
              <ProtectedRoute>
                <Archive />
              </ProtectedRoute>
            }
          />
          <Route
            path="settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
      </CurrencyProvider>
    </AuthProvider>
  );
}
