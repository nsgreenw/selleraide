import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkCsrfOrigin } from "@/lib/api/csrf";
import { getStandardLimiter } from "@/lib/api/rate-limit";
import { jsonError, jsonSuccess, jsonRateLimited } from "@/lib/api/response";
import { getGeminiGenerateModel } from "@/lib/gemini/client";

const aspectSpec = z.object({
  name: z.string().min(1).max(200),
  allowedValues: z.array(z.string().max(200)).max(200).optional(),
  cardinality: z.enum(["SINGLE", "MULTI"]).default("SINGLE"),
});

const inferAspectsSchema = z.object({
  title: z.string().max(500),
  description: z.string().max(15000),
  bullets: z.array(z.string().max(1000)).max(20).optional(),
  existingSpecifics: z
    .record(z.string().max(200), z.string().max(500))
    .optional(),
  aspects: z.array(aspectSpec).min(1).max(40),
});

export async function POST(req: NextRequest) {
  const csrfError = checkCsrfOrigin(req);
  if (csrfError) return jsonError(csrfError, 403);

  const auth = await requireAuth();
  if (auth.error) return jsonError(auth.error, 401);
  const user = auth.user!;

  const { success, reset } = await getStandardLimiter().limit(user.id);
  if (!success) return jsonRateLimited(Math.ceil((reset - Date.now()) / 1000));

  const body = await req.json().catch(() => null);
  const parsed = inferAspectsSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0].message);

  const { title, description, bullets, existingSpecifics, aspects } =
    parsed.data;

  const aspectLines = aspects
    .map((a) => {
      const enumPart =
        a.allowedValues && a.allowedValues.length > 0
          ? ` — MUST be one of: ${a.allowedValues.slice(0, 40).join(" | ")}`
          : "";
      const cardPart =
        a.cardinality === "MULTI"
          ? " [MULTI — multiple values allowed, comma-separated]"
          : " [SINGLE — exactly one value, no commas, no lists]";
      return `- "${a.name}"${cardPart}${enumPart}`;
    })
    .join("\n");

  const existingLines = existingSpecifics
    ? Object.entries(existingSpecifics)
        .map(([k, v]) => `- ${k}: ${v}`)
        .join("\n")
    : "(none)";

  const bulletLines = (bullets ?? []).map((b) => `- ${b}`).join("\n");

  const prompt = `You are populating eBay item specifics for an existing product listing.

Infer the most likely value for each required aspect using the listing title, description, bullets, and existing specifics. If a value is genuinely unknown and a reasonable default exists (e.g. "Unbranded" for Brand), use that. If an allowed-values list is given, the value MUST be exactly one of those values (character-for-character, including case).

CARDINALITY RULES — these are strict, eBay rejects violations:
- For aspects marked [SINGLE], return EXACTLY ONE value. Never use commas, semicolons, or lists. Pick the single best match. Example — if the listing mentions "Outdoor, Camping, Retro, Vintage" for a SINGLE Theme aspect, pick the one that best fits and return only that.
- For aspects marked [MULTI], you may return multiple comma-separated values.

LISTING TITLE:
${title}

DESCRIPTION:
${description}

BULLETS:
${bulletLines || "(none)"}

EXISTING ITEM SPECIFICS:
${existingLines}

ASPECTS TO FILL:
${aspectLines}

Return a JSON object mapping each aspect name to its inferred value string. No commentary, no markdown fences — JSON only. Example:
{"Brand": "Amazfit", "Compatible Operating System": "Android"}`;

  try {
    const model = getGeminiGenerateModel();
    const res = await model.generateContent(prompt);
    const raw = res.response.text();
    const cleaned = raw.replace(/```json\s*|\s*```/g, "").trim();
    let inferred: Record<string, string> = {};
    try {
      const parsed = JSON.parse(cleaned);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        for (const a of aspects) {
          const val = parsed[a.name];
          if (typeof val === "string" && val.trim().length > 0) {
            let clean = val.trim();
            // Defense against the AI returning comma-separated values for
            // a SINGLE aspect despite the prompt instruction.
            if (a.cardinality === "SINGLE" && /[,;|]/.test(clean)) {
              const first = clean.split(/[,;|]/)[0].trim();
              if (first.length > 0) clean = first;
            }
            inferred[a.name] = clean;
          }
        }
      }
    } catch {
      // Ignore bad JSON — user will fill manually
      inferred = {};
    }
    return jsonSuccess({ values: inferred });
  } catch (err) {
    console.error("[infer-aspects] model failure", err);
    return jsonSuccess({ values: {} });
  }
}
