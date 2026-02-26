"use client";

import { useState, createContext, useContext, useCallback } from "react";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { TrialBanner } from "@/components/ui/trial-banner";

interface AppShellContextValue {
  toggleMobileNav: () => void;
}

const AppShellContext = createContext<AppShellContextValue>({
  toggleMobileNav: () => {},
});

export function useAppShell() {
  return useContext(AppShellContext);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const toggleMobileNav = useCallback(() => {
    setMobileNavOpen((prev) => !prev);
  }, []);

  const closeMobileNav = useCallback(() => {
    setMobileNavOpen(false);
  }, []);

  return (
    <AppShellContext.Provider value={{ toggleMobileNav }}>
      <div className="flex h-screen">
        {/* Desktop sidebar */}
        <div className="hidden lg:block">
          <Sidebar />
        </div>

        {/* Mobile nav drawer */}
        <MobileNav open={mobileNavOpen} onClose={closeMobileNav} />

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4">
          <TrialBanner />
          {children}
        </main>
      </div>
    </AppShellContext.Provider>
  );
}
