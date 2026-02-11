"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types";

interface AppContextValue {
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const AppContext = createContext<AppContextValue>({
  profile: null,
  loading: true,
  refreshProfile: async () => {},
});

export function useApp() {
  return useContext(AppContext);
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    refreshProfile();
  }, []);

  return (
    <AppContext.Provider value={{ profile, loading, refreshProfile }}>
      {children}
    </AppContext.Provider>
  );
}
