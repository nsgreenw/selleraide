"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Plus, Cog, LogOut } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { useApp } from "@/components/providers";
import { useConversations } from "@/hooks/use-conversations";
import { createClient } from "@/lib/supabase/client";

const MARKETPLACE_COLORS: Record<string, string> = {
  amazon: "#ff9900",
  walmart: "#0071ce",
  ebay: "#e53238",
  shopify: "#96bf48",
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useApp();
  const { conversations, loading } = useConversations();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  function handleNewListing() {
    router.push("/chat");
  }

  return (
    <aside className="flex h-screen w-72 flex-col border-r border-white/10 bg-black/25 p-4">
      {/* Logo */}
      <div className="mb-6">
        <Logo variant="full" size="sm" />
      </div>

      {/* New Listing Button */}
      <button
        onClick={handleNewListing}
        className="btn-primary w-full mb-4"
      >
        <Plus className="mr-2 h-4 w-4" />
        New Listing
      </button>

      {/* Listing History */}
      <div className="flex-1 overflow-y-auto space-y-1.5">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-sa-200" />
          </div>
        ) : conversations.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-zinc-600">
            No listings yet
          </p>
        ) : (
          conversations.map((conv) => {
            const isActive = pathname === `/chat/${conv.id}`;
            return (
              <Link key={conv.id} href={`/chat/${conv.id}`}>
                <div
                  className={`card-subtle px-3 py-2.5 cursor-pointer transition duration-200 hover:border-white/20 ${
                    isActive ? "border-sa-200/30 bg-sa-200/5" : ""
                  }`}
                >
                  <p className="text-sm text-zinc-300 truncate">
                    {conv.title}
                  </p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{
                        backgroundColor:
                          MARKETPLACE_COLORS[conv.marketplace] ?? "#888",
                      }}
                    />
                    <span className="text-xs text-zinc-500 capitalize">
                      {conv.marketplace}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Bottom User Section */}
      <div className="mt-4 border-t border-white/10 pt-4">
        {profile && (
          <p className="mb-3 truncate text-xs text-zinc-500">
            {profile.email}
          </p>
        )}
        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            className="btn-secondary flex-1 gap-2 text-xs py-2"
          >
            <Cog className="h-3.5 w-3.5" />
            Settings
          </Link>
          <button
            onClick={handleLogout}
            className="btn-secondary px-3 py-2 text-xs"
            aria-label="Log out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
