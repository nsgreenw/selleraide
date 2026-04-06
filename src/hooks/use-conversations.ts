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

type ConversationLoadResult = {
  conversations: Conversation[] | null;
  error: string | null;
};

async function fetchConversationsData(): Promise<ConversationLoadResult> {
  const supabase = createClient();

  let user;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    return {
      conversations: null,
      error: "Unable to verify authentication. Please try refreshing the page.",
    };
  }

  if (!user) {
    return { conversations: [], error: null };
  }

  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return { conversations: null, error: "Failed to load conversations." };
  }

  return { conversations: data ?? [], error: null };
}

export function useConversations(): UseConversationsReturn {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    setLoading(true);

    const result = await fetchConversationsData();

    setError(result.error);
    if (result.conversations !== null) {
      setConversations(result.conversations);
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
    let isActive = true;

    async function loadInitialConversations() {
      const result = await fetchConversationsData();

      if (!isActive) return;

      setError(result.error);
      if (result.conversations !== null) {
        setConversations(result.conversations);
      }
      setLoading(false);
    }

    void loadInitialConversations();

    return () => {
      isActive = false;
    };
  }, []);

  return { conversations, loading, error, refresh, deleteConversation };
}
