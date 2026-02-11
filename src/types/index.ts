export type Marketplace = "amazon" | "walmart" | "ebay" | "shopify";

export type SubscriptionTier = "free" | "starter" | "pro" | "agency";

export type SubscriptionStatus =
  | "active"
  | "past_due"
  | "canceled"
  | "trialing"
  | "incomplete";

export type ConversationStatus =
  | "gathering"
  | "researching"
  | "generating"
  | "refining"
  | "completed";

export type MessageRole = "user" | "assistant" | "system";

export type QAGrade = "A" | "B" | "C" | "D" | "F";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  subscription_tier: SubscriptionTier;
  subscription_status: SubscriptionStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  listings_used_this_period: number;
  period_reset_at: string;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  marketplace: Marketplace;
  status: ConversationStatus;
  product_context: ProductContext;
  created_at: string;
  updated_at: string;
}

export interface ProductContext {
  product_name?: string;
  brand?: string;
  category?: string;
  key_features?: string[];
  target_audience?: string;
  differentiators?: string[];
  price_point?: string;
  compliance_info?: string;
  research_data?: ResearchData;
}

export interface ResearchData {
  keywords?: string[];
  trends?: string[];
  competitor_insights?: string[];
  category_notes?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Listing {
  id: string;
  conversation_id: string;
  user_id: string;
  marketplace: Marketplace;
  version: number;
  content: ListingContent;
  qa_results: QAResult[] | null;
  score: number | null;
  created_at: string;
  updated_at: string;
}

export interface ListingContent {
  title: string;
  bullets?: string[];
  description: string;
  backend_keywords?: string;
  seo_title?: string;
  meta_description?: string;
  tags?: string[];
  subtitle?: string;
  item_specifics?: Record<string, string>;
  attributes?: Record<string, string>;
  shelf_description?: string;
  a_plus_modules?: APlusModule[];
  collections?: string[];
  photo_recommendations?: PhotoRecommendation[];
}

export interface APlusModule {
  type: string;
  headline?: string;
  body?: string;
  image_alt?: string;
}

export interface PhotoRecommendation {
  slot: number;
  description: string;
  type: "main" | "lifestyle" | "infographic" | "detail" | "scale" | "packaging";
  tips: string[];
}

export interface QAResult {
  field: string;
  rule: string;
  severity: "error" | "warning" | "info";
  message: string;
}

export interface UsageEvent {
  id: string;
  user_id: string;
  event_type: string;
  conversation_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface SubscriptionPlan {
  id: SubscriptionTier;
  name: string;
  price_monthly_cents: number;
  listings_per_month: number | null;
  stripe_price_id_monthly: string | null;
  stripe_price_id_yearly: string | null;
  features: string[];
}

export function getGrade(score: number): QAGrade {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}
