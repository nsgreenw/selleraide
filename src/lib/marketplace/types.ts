import type { Marketplace } from "@/types";

export interface FieldConstraint {
  name: string;
  maxLength: number | null; // null = unlimited
  maxBytes?: number;
  required: boolean;
  htmlAllowed: boolean;
  description: string;
}

export interface BannedTermRule {
  pattern: RegExp;
  term: string;
  reason: string;
  severity: "error" | "warning";
}

export interface ScoringWeight {
  criterion: string;
  weight: number;
  description: string;
}

export interface KeywordStrategy {
  primaryPlacement: string;
  secondaryPlacement: string;
  maxKeywordsTitle: number;
  backendField: string | null;
  backendMaxBytes?: number;
  tips: string[];
}

export interface PhotoSlot {
  slot: number;
  name: string;
  type: "main" | "lifestyle" | "infographic" | "detail" | "scale" | "packaging";
  description: string;
  tips: string[];
}

export interface MarketplaceProfile {
  id: Marketplace;
  name: string;
  displayName: string;
  icon: string; // Lucide icon name
  fields: FieldConstraint[];
  bannedTerms: BannedTermRule[];
  scoringWeights: ScoringWeight[];
  keywordStrategy: KeywordStrategy;
  photoSlots: PhotoSlot[];
  promptModifier: string; // injected into AI prompt for marketplace-specific rules
  listingShape: string[]; // keys expected in listing content JSON
}
