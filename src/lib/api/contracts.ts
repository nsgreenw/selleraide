import { z } from "zod";
import { getEnabledMarketplaceIds } from "@/lib/marketplace/registry";

const strongPassword = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one digit");

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const signupSchema = z.object({
  email: z.string().email(),
  password: strongPassword,
  full_name: z.string().optional(),
});

export const resetPasswordSchema = z.object({
  email: z.string().email(),
});

export const updatePasswordSchema = z.object({
  password: strongPassword,
});

const marketplaceSchema = z
  .enum(["amazon", "walmart", "ebay", "shopify"])
  .refine((marketplace) => getEnabledMarketplaceIds().includes(marketplace), {
    message: "Marketplace is currently disabled",
  });

export const createConversationSchema = z.object({
  marketplace: marketplaceSchema,
  title: z.string().max(200).optional(),
});

export const sendMessageSchema = z.object({
  content: z.string().min(1).max(15000),
});

export const generateListingSchema = z.object({
  marketplace: marketplaceSchema,
  product_description: z.string().min(10).max(15000),
  condition: z.string().max(200).optional(),
  condition_notes: z.string().max(2000).optional(),
});

export const repurposeSchema = z.object({
  marketplace: marketplaceSchema,
});

export const refineListingSchema = z.object({
  instruction: z.string().min(1).max(5000),
});

export const checkoutSchema = z.object({
  plan_id: z.enum(["starter", "pro", "agency"]),
  interval: z.enum(["monthly", "yearly"]),
});

const auditAPlusImageSlot = z.object({
  alt_text: z.string().max(500),
  image_guidance: z.string().max(1000).optional(),
});

const auditAPlusModule = z.object({
  type: z.string().max(100),
  position: z.number().optional(),
  headline: z.string().max(500).optional(),
  body: z.string().max(10000).optional(),
  caption: z.string().max(1000).optional(),
  image: auditAPlusImageSlot.optional(),
  images: z.array(auditAPlusImageSlot).max(10).optional(),
  highlights: z.array(z.string().max(500)).max(20).optional(),
  specs: z.record(z.string().max(200), z.string().max(500)).optional(),
});

export const optimizeSchema = z.object({
  marketplace: z.enum(["amazon", "ebay"]),
  title: z.string().min(1).max(500),
  bullets: z.array(z.string().max(1000)).max(20).default([]),
  description: z.string().min(1).max(10000),
  backend_keywords: z.string().max(2000).optional(),
  attributes: z.record(z.string().max(200), z.string().max(500)).optional(),
  aplus_module_count: z.number().int().min(4).max(7).optional(),
  condition: z.string().max(200).optional(),
  condition_notes: z.string().max(2000).optional(),
  score: z.number().min(0).max(100),
  validation: z.array(z.object({
    severity: z.enum(["error", "warning", "info"]),
    field: z.string(),
    rule: z.string(),
    message: z.string(),
  })).default([]),
  breakdown: z.array(z.object({
    criterion: z.string(),
    score: z.number(),
    notes: z.string().optional(),
  })).default([]),
});

export const auditSchema = z.object({
  marketplace: z.enum(["amazon", "ebay"]),
  title: z.string().min(1).max(500),
  bullets: z.array(z.string().max(1000)).max(20).default([]),
  description: z.string().min(1).max(10000),
  backend_keywords: z.string().max(2000).optional(),
  attributes: z.record(z.string().max(200), z.string().max(500)).optional(),
  a_plus_modules: z.array(auditAPlusModule).max(7).optional(),
});

const photoRecommendation = z.object({
  slot: z.number().int().min(1),
  description: z.string().max(500),
  type: z.enum(["main", "lifestyle", "infographic", "detail", "scale", "packaging"]),
  tips: z.array(z.string().max(300)).max(10),
});

const listingContentSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().min(1).max(10000),
  bullets: z.array(z.string().max(1000)).max(20).optional(),
  backend_keywords: z.string().max(2000).optional(),
  seo_title: z.string().max(500).optional(),
  meta_description: z.string().max(1000).optional(),
  tags: z.array(z.string().max(200)).max(50).optional(),
  subtitle: z.string().max(500).optional(),
  item_specifics: z.record(z.string().max(200), z.string().max(500)).optional(),
  attributes: z.record(z.string().max(200), z.string().max(500)).optional(),
  shelf_description: z.string().max(10000).optional(),
  a_plus_modules: z.array(auditAPlusModule).max(7).optional(),
  collections: z.array(z.string().max(200)).max(20).optional(),
  photo_recommendations: z.array(photoRecommendation).max(10).optional(),
  compliance_notes: z.array(z.string().max(500)).max(10).optional(),
  assumptions: z.array(z.string().max(500)).max(10).optional(),
  condition_notes: z.array(z.string().max(500)).max(10).optional(),
  shipping_notes: z.string().max(2000).optional(),
  returns_notes: z.string().max(2000).optional(),
  category_hint: z.string().max(200).optional(),
});

export const saveListingSchema = z.object({
  marketplace: z.enum(["amazon", "walmart", "ebay", "shopify"]),
  content: listingContentSchema,
});

export const feedbackSchema = z.object({
  message: z.string().min(10, "Please provide at least 10 characters").max(2000),
  page_url: z.string().optional(),
});

export const patchListingSchema = z.object({
  content: z
    .object({
      title: z.string().min(1).max(500).optional(),
    })
    .refine(
      (obj) => Object.values(obj).some((v) => v !== undefined),
      "At least one field required"
    ),
});

export const batchRowSchema = z.object({
  product_description: z.string().min(10, "Product description must be at least 10 characters").max(15000),
  condition: z.string().max(200).optional(),
  condition_notes: z.string().max(2000).optional(),
});

export const createBatchSchema = z.object({
  marketplace: marketplaceSchema,
});

export const ebayPublishSchema = z.object({
  listingId: z.string().uuid(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Price must be a valid dollar amount"),
  quantity: z.number().int().min(1).max(99999).default(1),
  categoryId: z.string().min(1),
  condition: z.string().optional(),
});

export const ebaySetupLocationSchema = z.object({
  stateOrProvince: z.string().min(1).max(100),
  country: z.string().length(2).default("US"),
});

export const rewriteFieldSchema = z.object({
  marketplace: marketplaceSchema,
  field: z.enum(["title", "bullet", "description", "backend_keywords"]),
  bullet_index: z.number().int().min(0).optional(),
  current_value: z.string().min(1).max(5000),
  listing: z.object({
    title: z.string().max(500),
    bullets: z.array(z.string().max(1000)).max(20),
    description: z.string().max(10000),
    backend_keywords: z.string().max(2000).optional(),
  }),
  instructions: z.string().max(500).optional(),
});
