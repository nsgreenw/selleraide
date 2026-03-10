"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
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
  authUser: User | null;
  loading: boolean;
  bootstrapError: string | null;
  refreshProfile: () => Promise<void>;
  ebayConnection: EbayConnectionStatus | null;
  refreshEbayConnection: () => Promise<void>;
}

const AppContext = createContext<AppContextValue>({
  profile: null,
  authUser: null,
  loading: true,
  bootstrapError: null,
  refreshProfile: async () => {},
  ebayConnection: null,
  refreshEbayConnection: async () => {},
});

export function useApp() {
  return useContext(AppContext);
}

function BootstrapFailure({ message, onRetry }: { message: string; onRetry: () => Promise<void> }) {
  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-6">
      <div className="w-full max-w-lg rounded-2xl border border-rose-400/20 bg-zinc-900/90 p-6 shadow-2xl shadow-black/30">
        <p className="label-kicker mb-3 text-rose-300">Account bootstrap failed</p>
        <h1 className="mb-2 text-xl font-semibold text-zinc-100">
          SellerAide couldn&apos;t finish loading your account.
        </h1>
        <p className="mb-6 text-sm text-zinc-400">{message}</p>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => void onRetry()} className="btn-primary px-4 py-2 text-sm">
            Retry
          </button>
          <button onClick={handleSignOut} className="btn-secondary px-4 py-2 text-sm">
            Sign out
          </button>
          <a
            href="mailto:support@selleraide.com?subject=SellerAide%20account%20bootstrap%20issue"
            className="btn-secondary px-4 py-2 text-sm"
          >
            Contact support
          </a>
        </div>
      </div>
    </div>
  );
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [ebayConnection, setEbayConnection] =
    useState<EbayConnectionStatus | null>(null);

  const refreshProfile = useCallback(async () => {
    setLoading(true);
    setBootstrapError(null);

    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      setAuthUser(null);
      setProfile(null);
      setBootstrapError("Your session could not be verified. Please sign in again.");
      setLoading(false);
      return;
    }

    setAuthUser(user);

    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/profile/bootstrap", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const payload = await response.json().catch(() => null) as
        | { profile?: Profile; error?: string }
        | null;

      if (!response.ok || !payload?.profile) {
        throw new Error(payload?.error ?? "Your account profile could not be loaded.");
      }

      setProfile(payload.profile);
    } catch (error) {
      setProfile(null);
      setBootstrapError(
        error instanceof Error
          ? error.message
          : "Your account profile could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }, []);

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
    void refreshProfile();
    void refreshEbayConnection();
  }, [refreshEbayConnection, refreshProfile]);

  if (!loading && authUser && bootstrapError) {
    return <BootstrapFailure message={bootstrapError} onRetry={refreshProfile} />;
  }

  return (
    <AppContext.Provider
      value={{
        profile,
        authUser,
        loading,
        bootstrapError,
        refreshProfile,
        ebayConnection,
        refreshEbayConnection,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
