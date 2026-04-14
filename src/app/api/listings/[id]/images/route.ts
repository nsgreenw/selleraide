import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkCsrfOrigin } from "@/lib/api/csrf";
import { getStandardLimiter } from "@/lib/api/rate-limit";
import { jsonError, jsonSuccess, jsonRateLimited } from "@/lib/api/response";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { ListingImage } from "@/types";

const BUCKET = "listing-images";
const MAX_FILE_BYTES = 4 * 1024 * 1024; // Vercel request body limit is ~4.5 MB
const MAX_IMAGES = 12;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfError = checkCsrfOrigin(req);
  if (csrfError) return jsonError(csrfError, 403);

  const auth = await requireAuth();
  if (auth.error) return jsonError(auth.error, 401);
  const user = auth.user!;

  const { success, reset } = await getStandardLimiter().limit(user.id);
  if (!success) return jsonRateLimited(Math.ceil((reset - Date.now()) / 1000));

  const { id: listingId } = await params;
  const admin = getSupabaseAdmin();

  const { data: listing } = await admin
    .from("listings")
    .select("id, user_id, images")
    .eq("id", listingId)
    .eq("user_id", user.id)
    .single();

  if (!listing) return jsonError("Listing not found", 404);

  const current = (listing.images ?? []) as ListingImage[];
  if (current.length >= MAX_IMAGES) {
    return jsonError(`Maximum ${MAX_IMAGES} images per listing`);
  }

  const contentType = req.headers.get("content-type") ?? "";
  let newImage: ListingImage;

  if (contentType.startsWith("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return jsonError("Missing file");
    if (file.size > MAX_FILE_BYTES) {
      return jsonError(
        `File too large (max ${Math.floor(MAX_FILE_BYTES / 1024 / 1024)}MB)`
      );
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return jsonError("Unsupported file type — use JPG, PNG, or GIF");
    }

    const ext = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
    const storagePath = `${user.id}/${listingId}/${randomUUID()}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });
    if (uploadError) {
      console.error("[listing-images] upload failed", uploadError);
      return jsonError(`Upload failed: ${uploadError.message}`);
    }

    const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(storagePath);
    newImage = { url: pub.publicUrl, source: "upload", storagePath };
  } else {
    const body = await req.json().catch(() => null);
    const url = typeof body?.url === "string" ? body.url.trim() : "";
    if (!url) return jsonError("Missing url");
    try {
      new URL(url);
    } catch {
      return jsonError("Invalid URL");
    }
    if (!/^https:\/\//i.test(url)) {
      return jsonError("Image URL must use https");
    }
    newImage = { url, source: "url" };
  }

  const updated = [...current, newImage];
  const { error: updateError } = await admin
    .from("listings")
    .update({ images: updated })
    .eq("id", listingId);

  if (updateError) {
    console.error("[listing-images] listing update failed", updateError);
    // Roll back the storage upload if the DB write fails
    if (newImage.storagePath) {
      await admin.storage.from(BUCKET).remove([newImage.storagePath]).catch(() => {});
    }
    return jsonError("Failed to save image");
  }

  return jsonSuccess({ images: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfError = checkCsrfOrigin(req);
  if (csrfError) return jsonError(csrfError, 403);

  const auth = await requireAuth();
  if (auth.error) return jsonError(auth.error, 401);
  const user = auth.user!;

  const { id: listingId } = await params;
  const idxStr = req.nextUrl.searchParams.get("index");
  const index = idxStr !== null ? parseInt(idxStr, 10) : NaN;
  if (Number.isNaN(index)) return jsonError("Missing index");

  const admin = getSupabaseAdmin();
  const { data: listing } = await admin
    .from("listings")
    .select("id, user_id, images")
    .eq("id", listingId)
    .eq("user_id", user.id)
    .single();

  if (!listing) return jsonError("Listing not found", 404);

  const current = (listing.images ?? []) as ListingImage[];
  if (index < 0 || index >= current.length) {
    return jsonError("Invalid index");
  }

  const removed = current[index];
  const updated = [
    ...current.slice(0, index),
    ...current.slice(index + 1),
  ];

  if (removed.source === "upload" && removed.storagePath) {
    await admin.storage
      .from(BUCKET)
      .remove([removed.storagePath])
      .catch(() => {});
  }

  await admin.from("listings").update({ images: updated }).eq("id", listingId);

  return jsonSuccess({ images: updated });
}
