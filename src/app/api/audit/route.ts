import { NextRequest } from "next/server";
import { auditSchema } from "@/lib/api/contracts";
import { analyzeListing } from "@/lib/qa";
import { jsonSuccess, jsonError } from "@/lib/api/response";
import type { ListingContent, Marketplace } from "@/types";

export async function POST(req: NextRequest) {
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

  const { marketplace, title, bullets, description, backend_keywords, a_plus_modules } = parsed.data;

  const content: ListingContent = {
    title,
    bullets,
    description,
    backend_keywords,
    ...(a_plus_modules && a_plus_modules.length > 0
      ? { a_plus_modules: a_plus_modules as ListingContent["a_plus_modules"] }
      : {}),
  };

  const results = analyzeListing(content, marketplace as Marketplace);

  return jsonSuccess(results);
}
