import { requireAuth } from "@/lib/api/auth-guard";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/subscription/stripe";
import { z } from "zod";

const checkoutSchema = z.object({
  plan_id: z.enum(["starter", "pro"]),
  interval: z.enum(["monthly", "yearly"]),
});

/**
 * Look up the Stripe Price ID from environment variables.
 * Expected env var naming: STRIPE_PRICE_{PLAN}_MONTHLY or STRIPE_PRICE_{PLAN}_YEARLY
 * e.g. STRIPE_PRICE_STARTER_MONTHLY, STRIPE_PRICE_PRO_YEARLY
 */
function getStripePriceId(
  planId: string,
  interval: "monthly" | "yearly"
): string | undefined {
  const envKey = `STRIPE_PRICE_${planId.toUpperCase()}_${interval.toUpperCase()}`;
  return process.env[envKey];
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth();
    if (auth.error) {
      return jsonError(auth.error, 401);
    }
    const user = auth.user!;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError("Invalid JSON body", 400);
    }

    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        `Validation error: ${parsed.error.issues.map((i) => i.message).join(", ")}`,
        400
      );
    }

    const { plan_id, interval } = parsed.data;

    // Resolve the Stripe price ID
    const priceId = getStripePriceId(plan_id, interval);
    if (!priceId) {
      return jsonError(
        `Stripe price not configured for ${plan_id} ${interval}. Set STRIPE_PRICE_${plan_id.toUpperCase()}_${interval.toUpperCase()} env var.`,
        500
      );
    }

    const supabase = await createClient();

    // Get or create Stripe customer
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("stripe_customer_id, stripe_subscription_id, email")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("Checkout profile fetch failed:", profileError?.message);
      return jsonError(
        profileError ? "Failed to load account details" : "Account profile not found. Please contact support.",
        profileError ? 500 : 404
      );
    }

    let customerId = profile.stripe_customer_id;

    if (!customerId) {
      // Create a new Stripe customer
      const customer = await getStripe().customers.create({
        email: profile.email ?? user.email,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;

      // Save the Stripe customer ID to the profile
      await supabase
        .from("profiles")
        .update({
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      return jsonError("Application URL not configured. Set NEXT_PUBLIC_APP_URL.", 500);
    }

    // Create Stripe checkout session
    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      allow_promotion_codes: true,
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/settings/billing?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/settings/billing`,
      metadata: {
        user_id: user.id,
        plan_id,
        interval,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan_id,
        },
        ...(profile.stripe_subscription_id
          ? {}
          : { trial_period_days: 7 }),
      },
    });

    if (!session.url) {
      return jsonError("Failed to create checkout session", 500);
    }

    return jsonSuccess({ url: session.url });
  } catch (err) {
    console.error("Checkout session error:", err);
    const message = err instanceof Error ? err.message : "Failed to start Stripe checkout";
    return jsonError(message, 500);
  }
}
