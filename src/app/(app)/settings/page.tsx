"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Mail, CreditCard, LogOut, KeyRound } from "lucide-react";
import { Header } from "@/components/layout/header";
import { useApp } from "@/components/providers";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const router = useRouter();
  const { profile, loading } = useApp();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
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
