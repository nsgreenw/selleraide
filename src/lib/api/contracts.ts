import { z } from "zod";

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

export const createConversationSchema = z.object({
  marketplace: z.enum(["amazon", "walmart", "ebay", "shopify"]),
  title: z.string().optional(),
});

export const sendMessageSchema = z.object({
  content: z.string().min(1).max(15000),
});

export const generateListingSchema = z.object({
  marketplace: z.enum(["amazon", "walmart", "ebay", "shopify"]),
  product_description: z.string().min(10).max(15000),
});

export const refineListingSchema = z.object({
  instruction: z.string().min(1).max(5000),
});

export const checkoutSchema = z.object({
  plan_id: z.enum(["starter", "pro", "agency"]),
  interval: z.enum(["monthly", "yearly"]),
});
