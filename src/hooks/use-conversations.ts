"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Conversation } from "@/types";

interface UseConversationsReturn {
  conversations: Conversation[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
}

export function useConversations(): UseConversationsReturn {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    const supabase = createClient();

    let user;
    try {
      const { data } = await supabase.auth.getUser();
      user = data.user;
    } catch {
      setError("Unable to verify authentication. Please try refreshing the page.");
      setLoading(false);
      return;
    }

    if (!user) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const { data, error: fetchError } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (fetchError) {
      setError("Failed to load conversations.");
    } else if (data) {
      setConversations(data);
    }
    setLoading(false);
  }, []);

  const deleteConversation = useCallback(
    async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("conversations")
        .delete()
        .eq("id", id);

      if (!error) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
      }
    },
    []
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { conversations, loading, error, refresh, deleteConversation };
}
