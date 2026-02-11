"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Conversation, Message } from "@/types";

interface UseChatReturn {
  conversation: Conversation | null;
  messages: Message[];
  sendMessage: (content: string) => Promise<void>;
  loading: boolean;
}

export function useChat(conversationId: string): UseChatReturn {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchConversation() {
      setLoading(true);
      const supabase = createClient();

      const { data: conv } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", conversationId)
        .single();

      if (conv) {
        setConversation(conv);
      }

      const { data: msgs } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (msgs) {
        setMessages(msgs);
      }

      setLoading(false);
    }

    if (conversationId) {
      fetchConversation();
    }
  }, [conversationId]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!conversationId) return;

      // Optimistically add the user message to the list
      const optimisticUserMessage: Message = {
        id: `temp-${Date.now()}`,
        conversation_id: conversationId,
        role: "user",
        content,
        metadata: null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticUserMessage]);
      setLoading(true);

      try {
        const response = await fetch(
          `/api/chat/${conversationId}/messages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to send message");
        }

        const data = await response.json();

        // Replace the optimistic user message with the real one and append
        // the assistant response
        setMessages((prev) => {
          const withoutOptimistic = prev.filter(
            (m) => m.id !== optimisticUserMessage.id
          );
          const newMessages: Message[] = [];
          if (data.userMessage) {
            newMessages.push(data.userMessage);
          }
          if (data.assistantMessage) {
            newMessages.push(data.assistantMessage);
          }
          return [...withoutOptimistic, ...newMessages];
        });

        // Update conversation state if returned
        if (data.conversation) {
          setConversation(data.conversation);
        }
      } catch {
        // Remove the optimistic message on failure
        setMessages((prev) =>
          prev.filter((m) => m.id !== optimisticUserMessage.id)
        );
      } finally {
        setLoading(false);
      }
    },
    [conversationId]
  );

  return { conversation, messages, sendMessage, loading };
}
