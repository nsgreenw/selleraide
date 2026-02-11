"use client";

import { useEffect, useRef } from "react";
import type { Message } from "@/types";
import MessageBubble from "./message-bubble";

interface MessageListProps {
  messages: Message[];
}

export default function MessageList({ messages }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Never show system messages to the user
  const visibleMessages = messages.filter((m) => m.role !== "system");

  return (
    <div className="flex-1 overflow-y-auto space-y-3 px-2 py-4">
      {visibleMessages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
