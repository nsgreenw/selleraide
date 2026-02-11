"use client";

export default function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="card-glass px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-sa-200 animate-pulse" />
          <span className="h-2 w-2 rounded-full bg-sa-200 animate-pulse [animation-delay:150ms]" />
          <span className="h-2 w-2 rounded-full bg-sa-200 animate-pulse [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
