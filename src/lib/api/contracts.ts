import { z } from "zod";
import { getEnabledMarketplaceIds } from "@/lib/marketplace/registry";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().optional(),
});

export const resetPasswordSchema = z.object({
  email: z.string().email(),
});

export const updatePasswordSchema = z.object({
  password: z.string().min(6),
});

const marketplaceSchema = z
  .enum(["amazon", "walmart", "ebay", "shopify"])
  .refine((marketplace) => getEnabledMarketplaceIds().includes(marketplace), {
    message: "Marketplace is currently disabled",
  });

export const createConversationSchema = z.object({
  marketplace: marketplaceSchema,
  title: z.string().optional(),
});

export const sendMessageSchema = z.object({
  content: z.string().min(1).max(15000),
});

export const generateListingSchema = z.object({
  marketplace: marketplaceSchema,
  product_description: z.string().min(10).max(15000),
  condition: z.string().optional(),
  condition_notes: z.string().max(2000).optional(),
});

export const refineListingSchema = z.object({
  instruction: z.string().min(1).max(5000),
});

export const checkoutSchema = z.object({
  plan_id: z.enum(["starter", "pro", "agency"]),
  interval: z.enum(["monthly", "yearly"]),
});

const auditAPlusImageSlot = z.object({
  alt_text: z.string(),
  image_guidance: z.string().optional(),
});

const auditAPlusModule = z.object({
  type: z.string(),
  position: z.number().optional(),
  headline: z.string().optional(),
  body: z.string().optional(),
  caption: z.string().optional(),
  image: auditAPlusImageSlot.optional(),
  images: z.array(auditAPlusImageSlot).optional(),
  highlights: z.array(z.string()).optional(),
  specs: z.record(z.string(), z.string()).optional(),
});

export const optimizeSchema = z.object({
  marketplace: z.enum(["amazon", "ebay"]),
  title: z.string().min(1),
  bullets: z.array(z.string()).default([]),
  description: z.string().min(1),
  backend_keywords: z.string().optional(),
  condition: z.string().optional(),
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
  title: z.string().min(1),
  bullets: z.array(z.string()).default([]),
  description: z.string().min(1),
  backend_keywords: z.string().optional(),
  a_plus_modules: z.array(auditAPlusModule).optional(),
});

export const rewriteFieldSchema = z.object({
  marketplace: marketplaceSchema,
  field: z.enum(["title", "bullet", "description", "backend_keywords"]),
  bullet_index: z.number().int().min(0).optional(),
  current_value: z.string().min(1).max(5000),
  listing: z.object({
    title: z.string(),
    bullets: z.array(z.string()),
    description: z.string(),
    backend_keywords: z.string().optional(),
  }),
  instructions: z.string().max(500).optional(),
});
