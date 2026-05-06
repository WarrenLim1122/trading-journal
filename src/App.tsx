/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import { RiskCalculator } from "./pages/RiskCalculator";
import { AppLayout } from "./components/layout/AppLayout";
import { NewTrade } from "./pages/NewTrade";
import { StrategiesDashboard } from "./pages/StrategiesDashboard";
import { Settings } from "./pages/Settings";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return <AppLayout>{children}</AppLayout>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/new-trade" element={<ProtectedRoute><NewTrade /></ProtectedRoute>} />
          <Route path="/strategies" element={<ProtectedRoute><StrategiesDashboard /></ProtectedRoute>} />
          <Route path="/risk-calculator" element={<ProtectedRoute><RiskCalculator /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

