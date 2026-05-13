import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import { NewTrade } from "./pages/NewTrade";
import { RiskCalculator } from "./pages/RiskCalculator";
import { StrategiesDashboard } from "./pages/StrategiesDashboard";
import { Settings } from "./pages/Settings";
import { Cashflows } from "./pages/Cashflows";
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
  if (!user) return <Navigate to="/login" replace />;
  return <AppLayout>{children}</AppLayout>;
}

export default function App() {
  // Standalone deployment: enforce dark theme on <html> so portal-rendered
  // elements inherit the right CSS variables.
  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => document.documentElement.classList.remove("dark");
  }, []);

  return (
    <AuthProvider>
      <div className="dark">
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/new-trade" element={<ProtectedRoute><NewTrade /></ProtectedRoute>} />
            <Route path="/cashflows" element={<ProtectedRoute><Cashflows /></ProtectedRoute>} />
            <Route path="/strategies" element={<ProtectedRoute><StrategiesDashboard /></ProtectedRoute>} />
            <Route path="/risk-calculator" element={<ProtectedRoute><RiskCalculator /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          </Routes>
        </BrowserRouter>
      </div>
    </AuthProvider>
  );
}
