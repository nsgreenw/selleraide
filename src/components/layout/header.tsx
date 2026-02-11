"use client";

import { Menu, User } from "lucide-react";
import { useApp } from "@/components/providers";
import { PLANS } from "@/lib/subscription/plans";

interface HeaderProps {
  title?: string;
  onMenuToggle?: () => void;
}

export function Header({ title, onMenuToggle }: HeaderProps) {
  const { profile } = useApp();

  const used = profile?.listings_used_this_period ?? 0;
  const plan = profile ? PLANS[profile.subscription_tier] : PLANS.free;
  const limit = plan.listingsPerMonth;
  const percentage = limit !== null ? Math.min((used / limit) * 100, 100) : 0;
  const limitLabel = limit !== null ? String(limit) : "\u221e";

  return (
    <header className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl px-4 py-3 mb-4">
      {/* Left: Mobile menu button + page title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-1 text-zinc-400 hover:text-zinc-200 transition"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        {title && (
          <h1 className="text-sm font-medium text-zinc-200">{title}</h1>
        )}
      </div>

      {/* Right: Usage indicator + user avatar */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-zinc-500">Listings</p>
            <p className="text-sm font-medium text-zinc-300">
              {used}/{limitLabel}
            </p>
          </div>
          <div className="h-2 w-20 rounded-full bg-black/30">
            <div
              className="h-2 rounded-full bg-sa-200 transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* User avatar */}
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/[0.06]">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt=""
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <User className="h-4 w-4 text-zinc-400" />
          )}
        </div>
      </div>
    </header>
  );
}
