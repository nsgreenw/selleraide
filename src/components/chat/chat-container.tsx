"use client";

import type { ConversationStatus } from "@/types";
import { useChat } from "@/hooks/use-chat";
import MessageList from "./message-list";
import TypingIndicator from "./typing-indicator";
import ChatInput from "./chat-input";

function StatusBadge({ status }: { status?: ConversationStatus }) {
  if (!status) return null;

  const styles: Record<ConversationStatus, string> = {
    gathering: "text-blue-300 bg-blue-400/10 border-blue-300/25",
    researching: "text-amber-300 bg-amber-400/10 border-amber-300/25",
    generating: "",
    refining: "text-emerald-300 bg-emerald-400/10 border-emerald-300/25",
    completed: "text-emerald-300 bg-emerald-400/10 border-emerald-300/25",
  };

  const isGenerating = status === "generating";
  const baseClass = "rounded-full px-2.5 py-1 text-xs font-medium border";

  return (
    <span
      className={`${baseClass} ${isGenerating ? "" : styles[status]}`}
      style={
        isGenerating
          ? {
              color: "var(--sa-200)",
              backgroundColor: "color-mix(in srgb, var(--sa-200) 10%, transparent)",
              borderColor: "color-mix(in srgb, var(--sa-200) 25%, transparent)",
            }
          : undefined
      }
    >
      {status}
    </span>
  );
}

interface ChatContainerProps {
  conversationId: string;
}

export default function ChatContainer({ conversationId }: ChatContainerProps) {
  const { messages, conversation, loading, sendMessage, error } =
    useChat(conversationId);

  return (
    <div className="flex h-full flex-col bg-[radial-gradient(circle_at_10%_5%,rgba(246,203,99,0.08),transparent_34%),radial-gradient(circle_at_92%_0,rgba(252,232,180,0.05),transparent_29%)]">
      {/* Status bar */}
      <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2">
        <span className="label-kicker text-zinc-500">STATUS</span>
        <StatusBadge status={conversation?.status} />
      </div>

      {/* Message list */}
      <MessageList messages={messages} />

      {/* Typing indicator when loading */}
      {loading && <TypingIndicator />}

      {/* Error banner */}
      {error && (
        <div className="mx-4 mb-2 rounded-xl border border-rose-300/25 bg-rose-400/10 px-4 py-2.5 text-sm text-rose-200">
          {error}
        </div>
      )}

      {/* Chat input */}
      <div className="border-t border-white/10 p-4">
        <ChatInput onSend={sendMessage} disabled={loading} />
      </div>
    </div>
  );
}
