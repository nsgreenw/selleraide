"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Conversation } from "@/types";

interface UseConversationsReturn {
  conversations: Conversation[];
  loading: boolean;
  refresh: () => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
}

export function useConversations(): UseConversationsReturn {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (!error && data) {
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

  return { conversations, loading, refresh, deleteConversation };
}
