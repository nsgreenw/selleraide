"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types";

interface EbayConnectionStatus {
  connected: boolean;
  ebayUserId: string | null;
  policiesVerified: boolean;
  locationConfigured: boolean;
  ready: boolean;
}

interface AppContextValue {
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  ebayConnection: EbayConnectionStatus | null;
  refreshEbayConnection: () => Promise<void>;
}

const AppContext = createContext<AppContextValue>({
  profile: null,
  loading: true,
  refreshProfile: async () => {},
  ebayConnection: null,
  refreshEbayConnection: async () => {},
});

export function useApp() {
  return useContext(AppContext);
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [ebayConnection, setEbayConnection] =
    useState<EbayConnectionStatus | null>(null);

  async function refreshProfile() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    setProfile(data);
    setLoading(false);
  }

  const refreshEbayConnection = useCallback(async () => {
    try {
      const res = await fetch("/api/ebay/status");
      if (res.ok) {
        const data = await res.json();
        setEbayConnection(data);
      }
    } catch {
      // Silently fail — not critical for app function
    }
  }, []);

  useEffect(() => {
    refreshProfile();
    refreshEbayConnection();
  }, [refreshEbayConnection]);

  return (
    <AppContext.Provider
      value={{
        profile,
        loading,
        refreshProfile,
        ebayConnection,
        refreshEbayConnection,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
