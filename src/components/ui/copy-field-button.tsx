"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CopyFieldButtonProps {
  value: string;
}

export default function CopyFieldButton({ value }: CopyFieldButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded transition-colors hover:bg-white/5"
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-sa-200" />
      ) : (
        <Copy className="h-3.5 w-3.5 text-zinc-500 hover:text-zinc-300" />
      )}
    </button>
  );
}
