"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Crown,
  Zap,
  ExternalLink,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { useApp } from "@/components/providers";
import { PLANS } from "@/lib/subscription/plans";
import type { SubscriptionTier } from "@/types";

interface SubscriptionData {
  subscription: {
    tier: SubscriptionTier;
    status: string;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
  };
  usage: {
    listings_used: number;
    listings_limit: number | null;
    period_reset_at: string;
    can_generate: boolean;
  };
  plan: {
    name: string;
    priceMonthly: number;
    priceYearly: number;
    features: string[];
  };
}

const tierOrder: SubscriptionTier[] = ["starter", "pro", "agency"];

export default function BillingPage() {
  const { profile, refreshProfile } = useApp();
  const [subData, setSubData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    async function fetchSubscription() {
      try {
        const response = await fetch("/api/subscription");
        if (!response.ok) throw new Error("Failed to fetch subscription");
        const data = await response.json();
        setSubData(data);
      } catch {
        // Leave subData null on error
      } finally {
        setLoading(false);
      }
    }

    fetchSubscription();
  }, []);

  async function handleUpgrade(planId: SubscriptionTier) {
    setCheckoutLoading(planId);

    try {
      const response = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: planId, interval: "monthly" }),
      });

      if (!response.ok) throw new Error("Failed to create checkout session");
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setCheckoutLoading(null);
    }
  }

  async function handleManageSubscription() {
    setPortalLoading(true);

    try {
      const response = await fetch("/api/subscription/portal", {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to open portal");
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setPortalLoading(false);
    }
  }

  const currentTier = subData?.subscription.tier ?? profile?.subscription_tier ?? "free";
  const usageUsed = subData?.usage.listings_used ?? profile?.listings_used_this_period ?? 0;
  const usageLimit = subData?.usage.listings_limit ?? PLANS[currentTier].listingsPerMonth;
  const usagePercentage = usageLimit !== null ? Math.min((usageUsed / usageLimit) * 100, 100) : 0;
  const usageLimitLabel = usageLimit !== null ? String(usageLimit) : "\u221e";
  const resetAt = subData?.usage.period_reset_at ?? profile?.period_reset_at;

  if (loading) {
    return (
      <div className="space-y-6">
        <Header title="Billing" />
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-sa-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header title="Billing" />

      {/* Back link */}
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition duration-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Settings
      </Link>

      {/* Current Plan + Usage */}
      <div className="card-glass p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="label-kicker text-zinc-400">Current Plan</h2>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sa-200/30 bg-sa-200/10 px-3 py-1 text-sm font-medium text-sa-100">
            <Crown className="h-3.5 w-3.5" />
            {PLANS[currentTier].name}
          </span>
        </div>

        {/* Usage stats */}
        <div className="card-subtle p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-400">Listings this period</span>
            <span className="text-sm font-medium text-zinc-200">
              {usageUsed} / {usageLimitLabel}
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-black/30">
            <div
              className="h-2.5 rounded-full bg-sa-200 transition-all duration-500"
              style={{ width: `${usagePercentage}%` }}
            />
          </div>
          {resetAt && (
            <p className="mt-2 text-xs text-zinc-600">
              Resets {new Date(resetAt).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Manage Subscription */}
        {subData?.subscription.stripe_subscription_id && (
          <button
            onClick={handleManageSubscription}
            disabled={portalLoading}
            className="btn-secondary w-full gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            {portalLoading ? "Opening..." : "Manage Subscription"}
          </button>
        )}
      </div>

      {/* Plan Comparison */}
      <div>
        <h2 className="label-kicker text-zinc-400 mb-4">Plans</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {tierOrder.map((tierId) => {
            const plan = PLANS[tierId];
            const isCurrent = tierId === currentTier;
            const isUpgrade =
              tierOrder.indexOf(tierId) > tierOrder.indexOf(currentTier);

            return (
              <div
                key={tierId}
                className={`card-subtle p-5 flex flex-col ${
                  isCurrent
                    ? "border-sa-200/30 ring-1 ring-sa-200/20"
                    : ""
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-zinc-200">
                    {plan.name}
                  </h3>
                  {isCurrent && (
                    <span className="rounded-full bg-sa-200/10 px-2 py-0.5 text-[10px] font-medium text-sa-200 uppercase tracking-wider">
                      Current
                    </span>
                  )}
                </div>

                <div className="mb-4">
                  <span className="text-2xl font-bold text-zinc-100">
                    ${plan.priceMonthly}
                  </span>
                  <span className="text-xs text-zinc-500">/mo</span>
                </div>

                <ul className="flex-1 space-y-2 mb-4">
                  {plan.features.map((feature, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-xs text-zinc-400"
                    >
                      <Check className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <div className="btn-secondary w-full opacity-60 cursor-default pointer-events-none">
                    Current Plan
                  </div>
                ) : isUpgrade ? (
                  <button
                    onClick={() => handleUpgrade(tierId)}
                    disabled={checkoutLoading === tierId}
                    className="btn-primary w-full gap-2"
                  >
                    <Zap className="h-4 w-4" />
                    {checkoutLoading === tierId
                      ? "Loading..."
                      : currentTier === "free"
                        ? "Start 7-Day Trial"
                        : "Upgrade"}
                  </button>
                ) : (
                  <div className="btn-secondary w-full opacity-40 cursor-default pointer-events-none text-xs">
                    Included in your plan
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
