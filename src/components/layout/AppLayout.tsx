import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Calculator, LogOut, Activity, PlusCircle, FolderGit2, Settings as SettingsIcon, UserCircle, Wallet } from "lucide-react";
import { useAuth } from "@journal/contexts/AuthContext";
import { Button } from "@journal/components/ui/button";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { name: "New Trade", path: "/journal/new-trade", icon: PlusCircle },
    { name: "Dashboard", path: "/journal/dashboard", icon: LayoutDashboard },
    { name: "Cashflows", path: "/journal/cashflows", icon: Wallet },
    { name: "Strategies", path: "/journal/strategies", icon: FolderGit2 },
    { name: "Risk Calculator", path: "/journal/risk-calculator", icon: Calculator },
    { name: "Settings", path: "/journal/settings", icon: SettingsIcon },
  ];

  const displayName = user?.displayName || user?.email?.split('@')[0] || "Trader";

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card hidden md:flex flex-col sticky top-0 h-screen">
        <div className="p-6 flex items-center gap-3 border-b border-border">
          <div className="bg-primary/20 text-primary p-2 rounded-full">
             <UserCircle className="h-6 w-6 flex-shrink-0" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-bold truncate text-white">{displayName}</span>
            <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
          </div>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border space-y-2">
          <Link
            to="/"
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors font-mono"
          >
            ← Portfolio
          </Link>
          <Button variant="outline" className="w-full justify-start gap-2" onClick={logout}>
            <LogOut size={16} />
            Logout
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative min-w-0">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 text-primary p-2 rounded-full">
               <UserCircle className="h-5 w-5 flex-shrink-0" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-bold truncate text-white">{displayName}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/" className="text-xs font-mono text-muted-foreground hover:text-white transition-colors px-2">
              ← Portfolio
            </Link>
            <Button variant="ghost" size="icon" onClick={logout}>
               <LogOut size={18} />
            </Button>
          </div>
        </header>

        {/* Mobile Nav */}
        <div className="md:hidden px-4 py-2 flex gap-4 overflow-x-auto no-scrollbar border-b border-border bg-background sticky top-[73px] z-40 shadow-sm">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-primary text-black"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>

        <div className="flex-1 p-4 md:p-6 w-full max-w-[100vw] overflow-x-hidden">
           {children}
        </div>
      </main>
    </div>
  );
}
