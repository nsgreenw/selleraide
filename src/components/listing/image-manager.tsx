"use client";

import { useState } from "react";
import { Upload, Link as LinkIcon, X, Loader2 } from "lucide-react";
import type { ListingImage } from "@/types";

interface ImageManagerProps {
  listingId: string;
  images: ListingImage[];
  onChange: (images: ListingImage[]) => void;
}

const MAX_IMAGES = 12;

export default function ImageManager({
  listingId,
  images,
  onChange,
}: ImageManagerProps) {
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [addingUrl, setAddingUrl] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAddMore = images.length < MAX_IMAGES;

  async function handleFiles(files: FileList) {
    setError(null);
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (images.length >= MAX_IMAGES) break;
        const form = new FormData();
        form.append("file", file);
        const res = await fetch(`/api/listings/${listingId}/images`, {
          method: "POST",
          body: form,
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Upload failed");
          break;
        }
        onChange(data.images);
      }
    } catch {
      setError("Network error");
    } finally {
      setUploading(false);
    }
  }

  async function handleAddUrl() {
    if (!urlInput.trim()) return;
    setError(null);
    setAddingUrl(true);
    try {
      const res = await fetch(`/api/listings/${listingId}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to add URL");
        return;
      }
      onChange(data.images);
      setUrlInput("");
    } catch {
      setError("Network error");
    } finally {
      setAddingUrl(false);
    }
  }

  async function handleRemove(index: number) {
    setError(null);
    try {
      const res = await fetch(
        `/api/listings/${listingId}/images?index=${index}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to remove");
        return;
      }
      onChange(data.images);
    } catch {
      setError("Network error");
    }
  }

  return (
    <div>
      <label className="label-kicker text-zinc-500 block mb-2">
        Images ({images.length}/{MAX_IMAGES})
      </label>

      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-2 mb-3">
          {images.map((img, i) => (
            <div key={`${img.url}-${i}`} className="relative group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt=""
                className="w-full aspect-square object-cover rounded-lg border border-white/10 bg-black/30"
              />
              <button
                onClick={() => handleRemove(i)}
                className="absolute top-1 right-1 rounded-full bg-black/70 p-1 opacity-0 group-hover:opacity-100 transition"
                aria-label="Remove image"
              >
                <X className="h-3 w-3 text-white" />
              </button>
              {img.source === "url" && (
                <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1 py-0.5 text-[10px] text-zinc-300">
                  URL
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {canAddMore && (
        <div className="space-y-2">
          <label className="flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg border border-dashed border-white/10 hover:border-sa-200/30 cursor-pointer transition">
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            <span>{uploading ? "Uploading..." : "Upload images"}</span>
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/gif"
              onChange={(e) => {
                if (e.target.files) handleFiles(e.target.files);
                e.target.value = "";
              }}
              className="hidden"
              disabled={uploading}
            />
          </label>

          <div className="flex gap-2">
            <div className="flex-1 relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddUrl();
                  }
                }}
                placeholder="Paste image URL"
                className="w-full rounded-lg border border-white/10 bg-black/30 pl-9 pr-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-sa-200/50 focus:outline-none"
              />
            </div>
            <button
              onClick={handleAddUrl}
              disabled={!urlInput.trim() || addingUrl}
              className="btn-secondary px-3 py-2 text-sm disabled:opacity-50"
            >
              {addingUrl ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Add"
              )}
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-rose-300 mt-2">{error}</p>}
    </div>
  );
}
