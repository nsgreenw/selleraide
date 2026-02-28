import type { ListingContent } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Columns that exist in every eBay Seller Hub export but carry no useful
 *  listing-content data — discard them instead of dumping them into
 *  item_specifics. Normalized (lowercased, no leading asterisks). */
export const EBAY_SKIP_COLUMNS = new Set<string>([
  "action",
  "format",
  "duration",
  "starting price",
  "buy it now price",
  "quantity",
  "lot size",
  "best offer enabled",
  "best offer auto accept price",
  "best offer auto decline price",
  "payment profile name",
  "return profile name",
  "shipping profile name",
  "site id",
  "currency",
  "immediate pay required",
  "variations enabled",
  "relationship",
  "relationship details",
  "condition id",     // handled separately — mapped via EBAY_CONDITION_MAP
  "condition description", // handled separately — split into condition_notes
]);

/** Maps normalized eBay column name → ListingContent field name.
 *  Columns in this map are extracted explicitly in mapEbayRow(); the rest
 *  that are not in EBAY_SKIP_COLUMNS become item_specifics. */
export const EBAY_CORE_COLUMNS = new Map<string, keyof ListingContent>([
  ["title", "title"],
  ["description", "description"],
  ["subtitle", "subtitle"],
  ["category name", "category_hint"],
  ["category id", "category_hint"], // fallback if category name absent
]);

/** Numeric eBay Condition IDs → human-readable condition strings. */
export const EBAY_CONDITION_MAP: Record<string, string> = {
  "1000": "New",
  "1500": "Open Box",
  "2000": "Certified Refurbished",
  "2500": "Seller Refurbished",
  "3000": "Pre-Owned",
  "4000": "Very Good",
  "5000": "Good",
  "6000": "Acceptable",
  "7000": "For Parts or Not Working",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip leading asterisks (eBay marks required fields with *), trim, lowercase. */
export function normalizeColumnName(col: string): string {
  return col.replace(/^\*+/, "").trim().toLowerCase();
}

// ---------------------------------------------------------------------------
// CSV Parser
// ---------------------------------------------------------------------------

export interface ParsedCSV {
  headers: string[]; // original (non-normalized) header names
  rows: Record<string, string>[];
}

/**
 * Character-by-character CSV state machine.
 * Handles:
 * - BOM (U+FEFF) at start — common in Windows eBay exports
 * - CRLF and LF line endings
 * - Quoted cells containing commas, newlines, and escaped double-quotes ("")
 * - Short rows (missing trailing cells filled with "")
 * - Entirely blank rows (skipped)
 */
export function parseCSV(text: string): ParsedCSV {
  // Strip BOM
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  // Normalise line endings
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  type State = "normal" | "in_quotes";

  const records: string[][] = [];
  let currentRecord: string[] = [];
  let currentCell = "";
  let state: State = "normal";

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (state === "normal") {
      if (ch === '"') {
        state = "in_quotes";
      } else if (ch === ",") {
        currentRecord.push(currentCell);
        currentCell = "";
      } else if (ch === "\n") {
        currentRecord.push(currentCell);
        currentCell = "";
        records.push(currentRecord);
        currentRecord = [];
      } else {
        currentCell += ch;
      }
    } else {
      // in_quotes
      if (ch === '"') {
        if (text[i + 1] === '"') {
          // Escaped quote ""
          currentCell += '"';
          i++;
        } else {
          state = "normal";
        }
      } else {
        currentCell += ch;
      }
    }
  }

  // Flush any trailing content (no trailing newline)
  if (currentCell || currentRecord.length > 0) {
    currentRecord.push(currentCell);
    records.push(currentRecord);
  }

  if (records.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = records[0];
  const rows: Record<string, string>[] = [];

  for (let r = 1; r < records.length; r++) {
    const rec = records[r];

    // Skip entirely blank rows
    if (rec.every((cell) => cell.trim() === "")) continue;

    const row: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      row[headers[c]] = rec[c] ?? ""; // fill missing trailing cells
    }
    rows.push(row);
  }

  return { headers, rows };
}

// ---------------------------------------------------------------------------
// Row mapper
// ---------------------------------------------------------------------------

export interface MappedRow {
  content: ListingContent;
  condition?: string;
  error?: string;
}

/**
 * Maps a single parsed eBay CSV row to a ListingContent object.
 *
 * - Core fields (title, description, subtitle, category) are extracted first.
 * - Condition ID is resolved via EBAY_CONDITION_MAP and returned separately
 *   (callers may prepend it to condition_notes before storing).
 * - Every other non-skipped, non-empty column is placed in item_specifics.
 * - Returns an error string if the required Title field is missing.
 */
export function mapEbayRow(row: Record<string, string>): MappedRow {
  // Build a normalized-key lookup for efficient access
  const normMap = new Map<string, string>();
  for (const [key, value] of Object.entries(row)) {
    normMap.set(normalizeColumnName(key), value);
  }

  // --- Title (required) ---
  const title = (normMap.get("title") ?? "").trim();
  if (!title) {
    return {
      content: { title: "", description: "" },
      error: "Missing required field: Title",
    };
  }

  // --- Description (HTML preserved — eBay profile allows HTML) ---
  const description = (normMap.get("description") ?? "").trim();

  // --- Optional core fields ---
  const subtitle = (normMap.get("subtitle") ?? "").trim() || undefined;

  // Category: prefer "category name" over "category id"
  const categoryHint =
    (normMap.get("category name") ?? "").trim() ||
    (normMap.get("category id") ?? "").trim() ||
    undefined;

  // --- Condition ---
  const rawConditionId = (normMap.get("condition id") ?? "").trim();
  let condition: string | undefined;
  if (rawConditionId) {
    // Try numeric ID lookup first, fall back to raw string
    condition = EBAY_CONDITION_MAP[rawConditionId] ?? rawConditionId;
  }

  // --- Condition Description → condition_notes ---
  const rawConditionDesc = (normMap.get("condition description") ?? "").trim();
  const conditionNotes: string[] = rawConditionDesc
    ? rawConditionDesc
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
    : [];

  // --- Item specifics: everything not skip-listed or core-mapped ---
  const coreNormNames = new Set([
    ...Array.from(EBAY_CORE_COLUMNS.keys()),
    "condition id",
    "condition description",
  ]);

  const itemSpecifics: Record<string, string> = {};
  for (const [originalKey, value] of Object.entries(row)) {
    const norm = normalizeColumnName(originalKey);
    if (EBAY_SKIP_COLUMNS.has(norm)) continue;
    if (coreNormNames.has(norm)) continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    itemSpecifics[originalKey] = trimmed;
  }

  // --- Assemble content ---
  const content: ListingContent = {
    title,
    description,
    ...(subtitle ? { subtitle } : {}),
    ...(categoryHint ? { category_hint: categoryHint } : {}),
    ...(conditionNotes.length > 0 ? { condition_notes: conditionNotes } : {}),
    ...(Object.keys(itemSpecifics).length > 0
      ? { item_specifics: itemSpecifics }
      : {}),
  };

  return { content, condition };
}
