"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Plus, Cog, LogOut, X, Zap, Search, Megaphone } from "lucide-react";
import { useState } from "react";
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

type Tool = "generator" | "audit" | "ads";

const TOOLS: { id: Tool; label: string; icon: typeof Zap; path: string; newLabel: string; comingSoon?: boolean }[] = [
  { id: "generator", label: "Listing Generator", icon: Zap, path: "/chat", newLabel: "New Listing" },
  { id: "audit", label: "Listing Audit", icon: Search, path: "/audit", newLabel: "New Audit" },
  { id: "ads", label: "Ads Coach", icon: Megaphone, path: "/ads", newLabel: "New Campaign", comingSoon: true },
];

function getActiveTool(pathname: string): Tool {
  if (pathname.startsWith("/audit")) return "audit";
  if (pathname.startsWith("/ads")) return "ads";
  return "generator";
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useApp();
  const { conversations, loading, refresh } = useConversations();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const activeTool = getActiveTool(pathname);

  async function handleDeleteConversation(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (deletingId) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/chat/${id}`, { method: "DELETE" });
      if (res.ok) {
        refresh();
        if (pathname === `/chat/${id}`) {
          router.push("/chat");
        }
      }
    } finally {
      setDeletingId(null);
    }
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const currentTool = TOOLS.find((t) => t.id === activeTool) ?? TOOLS[0];

  return (
    <aside className="flex h-screen w-72 flex-col border-r border-white/10 bg-black/25 p-4">
      {/* Logo */}
      <div className="mb-4">
        <Logo variant="full" size="sm" />
      </div>

      {/* Tool Switcher */}
      <div className="mb-4 space-y-1">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => !tool.comingSoon && router.push(tool.path)}
              disabled={tool.comingSoon}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition duration-200 ${
                isActive
                  ? "bg-sa-200/10 text-sa-200 border border-sa-200/30"
                  : tool.comingSoon
                    ? "text-zinc-600 cursor-not-allowed"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{tool.label}</span>
              {tool.comingSoon && (
                <span className="ml-auto text-[10px] uppercase tracking-wider text-zinc-600 font-mono">Soon</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="border-t border-white/10 mb-4" />

      {/* New Action Button (contextual) */}
      <button
        onClick={() => router.push(currentTool.path)}
        className="btn-primary w-full mb-4"
      >
        <Plus className="mr-2 h-4 w-4" />
        {currentTool.newLabel}
      </button>

      {/* History (only for generator tool) */}
      <div className="flex-1 overflow-y-auto space-y-1.5">
        {activeTool === "generator" ? (
          loading ? (
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
                    className={`group card-subtle px-3 py-2.5 cursor-pointer transition duration-200 hover:border-white/20 relative ${
                      isActive ? "border-sa-200/30 bg-sa-200/5" : ""
                    }`}
                  >
                    <button
                      onClick={(e) => handleDeleteConversation(conv.id, e)}
                      disabled={deletingId === conv.id}
                      className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10 text-zinc-500 hover:text-red-400"
                      aria-label="Delete conversation"
                    >
                      {deletingId === conv.id ? (
                        <div className="h-3 w-3 animate-spin rounded-full border border-zinc-500 border-t-transparent" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                    </button>
                    <p className="text-sm text-zinc-300 truncate pr-5">
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
          )
        ) : activeTool === "audit" ? (
          <p className="px-3 py-6 text-center text-xs text-zinc-600">
            Paste a listing above to audit it
          </p>
        ) : (
          <p className="px-3 py-6 text-center text-xs text-zinc-600">
            Coming soon
          </p>
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
