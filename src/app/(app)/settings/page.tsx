"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  User,
  Mail,
  CreditCard,
  LogOut,
  KeyRound,
  Tag,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { useApp } from "@/components/providers";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Header title="Settings" />
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-sa-200" />
          </div>
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const { profile, loading, ebayConnection, refreshEbayConnection } = useApp();
  const searchParams = useSearchParams();

  const [connectingEbay, setConnectingEbay] = useState(false);
  const [disconnectingEbay, setDisconnectingEbay] = useState(false);
  const [checkingPolicies, setCheckingPolicies] = useState(false);
  const [policiesResult, setPoliciesResult] = useState<{
    policiesReady: boolean;
    missing: string[];
    setupUrl?: string;
  } | null>(null);
  const [locationState, setLocationState] = useState("MI");
  const [locationCountry, setLocationCountry] = useState("US");
  const [savingLocation, setSavingLocation] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Handle post-OAuth redirect params
  useEffect(() => {
    const ebayParam = searchParams.get("ebay");
    if (ebayParam === "connected") {
      setToast({ type: "success", message: "eBay account connected!" });
      refreshEbayConnection();
    } else if (ebayParam === "error") {
      const reason = searchParams.get("reason");
      setToast({
        type: "error",
        message: `eBay connection failed${reason ? `: ${reason}` : ""}`,
      });
    }
  }, [searchParams, refreshEbayConnection]);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  async function handleConnectEbay() {
    setConnectingEbay(true);
    try {
      const res = await fetch("/api/ebay/auth", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        setToast({
          type: "error",
          message: data.error ?? "Failed to start eBay connection",
        });
      }
    } catch {
      setToast({ type: "error", message: "Network error" });
    } finally {
      setConnectingEbay(false);
    }
  }

  async function handleDisconnectEbay() {
    if (!confirm("Disconnect your eBay account? This will reset all eBay listing statuses.")) return;
    setDisconnectingEbay(true);
    try {
      const res = await fetch("/api/ebay/disconnect", { method: "POST" });
      if (res.ok) {
        setToast({ type: "success", message: "eBay account disconnected" });
        refreshEbayConnection();
        setPoliciesResult(null);
      }
    } catch {
      setToast({ type: "error", message: "Failed to disconnect" });
    } finally {
      setDisconnectingEbay(false);
    }
  }

  async function handleCheckPolicies() {
    setCheckingPolicies(true);
    try {
      const res = await fetch("/api/ebay/policies");
      if (res.ok) {
        const data = await res.json();
        setPoliciesResult(data);
        if (data.policiesReady) {
          refreshEbayConnection();
        }
      }
    } catch {
      setToast({ type: "error", message: "Failed to check policies" });
    } finally {
      setCheckingPolicies(false);
    }
  }

  async function handleSetupLocation() {
    setSavingLocation(true);
    try {
      const res = await fetch("/api/ebay/setup-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stateOrProvince: locationState,
          country: locationCountry,
        }),
      });
      if (res.ok) {
        setToast({ type: "success", message: "Inventory location created" });
        refreshEbayConnection();
      } else {
        const data = await res.json();
        setToast({
          type: "error",
          message: data.error ?? "Failed to create location",
        });
      }
    } catch {
      setToast({ type: "error", message: "Network error" });
    } finally {
      setSavingLocation(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Header title="Settings" />
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-sa-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header title="Settings" />

      {/* Toast */}
      {toast && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            toast.type === "success"
              ? "border-emerald-400/20 bg-emerald-400/5 text-emerald-300"
              : "border-rose-400/20 bg-rose-400/5 text-rose-300"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Profile Section */}
      <div className="card-glass p-6">
        <h2 className="label-kicker text-zinc-400 mb-4">Profile</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.06]">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <User className="h-5 w-5 text-zinc-400" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-200">
                {profile?.full_name || "No name set"}
              </p>
              <p className="text-xs text-zinc-500">
                Member since{" "}
                {profile
                  ? new Date(profile.created_at).toLocaleDateString()
                  : "--"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-white/5 bg-black/20 px-4 py-3">
            <Mail className="h-4 w-4 text-zinc-500" />
            <div>
              <p className="text-xs text-zinc-500">Email</p>
              <p className="text-sm text-zinc-300">{profile?.email ?? "--"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* eBay Connection Section */}
      <div className="card-glass p-6">
        <h2 className="label-kicker text-zinc-400 mb-4 flex items-center gap-2">
          <Tag className="h-4 w-4" />
          eBay Connection
        </h2>

        {!ebayConnection?.connected ? (
          <div className="space-y-3">
            <p className="text-sm text-zinc-400">
              Connect your eBay account to publish listings directly from
              SellerAide.
            </p>
            <button
              onClick={handleConnectEbay}
              disabled={connectingEbay}
              className="btn-primary flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-50"
            >
              {connectingEbay ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect eBay Account"
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Connected status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="text-sm text-zinc-200">
                  {ebayConnection.ebayUserId
                    ? `Connected as ${ebayConnection.ebayUserId}`
                    : "eBay account connected"}
                </span>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                  Connected
                </span>
              </div>
              <button
                onClick={handleDisconnectEbay}
                disabled={disconnectingEbay}
                className="text-xs text-rose-400 hover:text-rose-300 transition"
              >
                {disconnectingEbay ? "Disconnecting..." : "Disconnect"}
              </button>
            </div>

            {/* Setup checklist */}
            <div className="rounded-lg border border-white/5 bg-black/20 p-4 space-y-3">
              <span className="label-kicker text-zinc-500">Setup Status</span>

              {/* 1. Connected */}
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="text-zinc-300">eBay account connected</span>
              </div>

              {/* 2. Business Policies */}
              <div className="flex items-center gap-2 text-sm">
                {ebayConnection.policiesVerified ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span className="text-zinc-300">
                      Business policies verified
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-amber-400" />
                    <span className="text-zinc-400">
                      Business policies needed
                    </span>
                    <button
                      onClick={handleCheckPolicies}
                      disabled={checkingPolicies}
                      className="ml-auto text-xs text-sa-200 hover:underline"
                    >
                      {checkingPolicies ? "Checking..." : "Check Policies"}
                    </button>
                  </>
                )}
              </div>

              {/* Policies result */}
              {policiesResult && !policiesResult.policiesReady && (
                <div className="ml-6 rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 text-sm">
                  <p className="text-amber-300 mb-2">
                    Missing: {policiesResult.missing.join(", ")} policies
                  </p>
                  <a
                    href={policiesResult.setupUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sa-200 hover:underline inline-flex items-center gap-1"
                  >
                    Set up on eBay <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {/* 3. Inventory Location */}
              <div className="flex items-center gap-2 text-sm">
                {ebayConnection.locationConfigured ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span className="text-zinc-300">
                      Inventory location configured
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-amber-400" />
                    <span className="text-zinc-400">
                      Inventory location needed
                    </span>
                  </>
                )}
              </div>

              {/* Location setup form */}
              {ebayConnection.connected &&
                !ebayConnection.locationConfigured && (
                  <div className="ml-6 space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={locationState}
                        onChange={(e) => setLocationState(e.target.value)}
                        placeholder="State (e.g. MI)"
                        className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-sa-200/50 focus:outline-none"
                      />
                      <input
                        type="text"
                        value={locationCountry}
                        onChange={(e) => setLocationCountry(e.target.value)}
                        placeholder="US"
                        maxLength={2}
                        className="w-16 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-sa-200/50 focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={handleSetupLocation}
                      disabled={savingLocation || !locationState}
                      className="btn-secondary flex items-center gap-2 px-3 py-1.5 text-xs disabled:opacity-50"
                    >
                      {savingLocation ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create Location"
                      )}
                    </button>
                  </div>
                )}

              {/* Ready indicator */}
              {ebayConnection.ready && (
                <div className="pt-2 border-t border-white/5">
                  <div className="flex items-center gap-2 text-sm text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" />
                    Ready to publish eBay listings
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Account Actions */}
      <div className="card-glass p-6">
        <h2 className="label-kicker text-zinc-400 mb-4">Account</h2>
        <div className="space-y-3">
          <Link
            href="/settings/billing"
            className="flex items-center gap-3 rounded-lg border border-white/5 bg-black/20 px-4 py-3 text-sm text-zinc-300 hover:bg-white/[0.07] transition duration-200"
          >
            <CreditCard className="h-4 w-4 text-zinc-500" />
            Billing & Subscription
          </Link>

          <Link
            href="/forgot-password"
            className="flex items-center gap-3 rounded-lg border border-white/5 bg-black/20 px-4 py-3 text-sm text-zinc-300 hover:bg-white/[0.07] transition duration-200"
          >
            <KeyRound className="h-4 w-4 text-zinc-500" />
            Change Password
          </Link>

          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg border border-white/5 bg-black/20 px-4 py-3 text-sm text-rose-400 hover:bg-rose-400/5 transition duration-200"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
