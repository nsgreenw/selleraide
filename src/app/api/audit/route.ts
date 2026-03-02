import { NextRequest } from "next/server";
import { auditSchema } from "@/lib/api/contracts";
import { analyzeListing } from "@/lib/qa";
import { jsonSuccess, jsonError, jsonRateLimited } from "@/lib/api/response";
import { getPublicLimiter, getIP } from "@/lib/api/rate-limit";
import type { ListingContent, Marketplace } from "@/types";

export async function POST(req: NextRequest) {
  const { success, reset } = await getPublicLimiter().limit(getIP(req));
  if (!success) return jsonRateLimited(Math.ceil((reset - Date.now()) / 1000));

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const parsed = auditSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues.map(i => i.message).join(", "), 400);
  }

  const { marketplace, title, bullets, description, backend_keywords, attributes, a_plus_modules } = parsed.data;

  const content: ListingContent = {
    title,
    bullets,
    description,
    backend_keywords,
    ...(attributes && Object.keys(attributes).length > 0 ? { attributes } : {}),
    ...(a_plus_modules && a_plus_modules.length > 0
      ? { a_plus_modules: a_plus_modules as ListingContent["a_plus_modules"] }
      : {}),
  };

  const results = analyzeListing(content, marketplace as Marketplace);

  return jsonSuccess(results);
}
