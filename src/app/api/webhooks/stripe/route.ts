import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/subscription/stripe";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { SubscriptionTier } from "@/types";

export const runtime = "nodejs";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * Map a plan_id string from checkout metadata to a SubscriptionTier.
 * Falls back to "free" if the value is not recognized.
 */
function toSubscriptionTier(planId: string | undefined): SubscriptionTier {
  const valid: SubscriptionTier[] = ["free", "starter", "pro", "agency"];
  if (planId && valid.includes(planId as SubscriptionTier)) {
    return planId as SubscriptionTier;
  }
  return "free";
}

export async function POST(request: NextRequest) {
  if (!WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  // Read the raw body for signature verification
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(body, signature, WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const planId = session.metadata?.plan_id;

        if (!userId) {
          break;
        }

        const updateData: Record<string, unknown> = {
          stripe_customer_id: session.customer as string,
          subscription_tier: toSubscriptionTier(planId),
          subscription_status: "active",
          updated_at: new Date().toISOString(),
        };

        // Store the subscription ID if available
        if (session.subscription) {
          updateData.stripe_subscription_id = session.subscription as string;
        }

        await getSupabaseAdmin()
          .from("profiles")
          .update(updateData)
          .eq("id", userId);

        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.user_id;

        if (!userId) {
          // Try to find user by stripe_customer_id
          const customerId =
            typeof subscription.customer === "string"
              ? subscription.customer
              : subscription.customer.toString();

          const { data: profile } = await getSupabaseAdmin()
            .from("profiles")
            .select("id")
            .eq("stripe_customer_id", customerId)
            .single();

          if (!profile) {
            break;
          }

          // Map Stripe subscription status to our status
          const statusMap: Record<string, string> = {
            active: "active",
            past_due: "past_due",
            canceled: "canceled",
            trialing: "trialing",
            incomplete: "incomplete",
            incomplete_expired: "canceled",
            unpaid: "past_due",
            paused: "past_due",
          };

          const mappedStatus =
            statusMap[subscription.status] ?? "active";

          await getSupabaseAdmin()
            .from("profiles")
            .update({
              subscription_status: mappedStatus,
              updated_at: new Date().toISOString(),
            })
            .eq("id", profile.id);

          break;
        }

        // User ID found in metadata
        const statusMap: Record<string, string> = {
          active: "active",
          past_due: "past_due",
          canceled: "canceled",
          trialing: "trialing",
          incomplete: "incomplete",
          incomplete_expired: "canceled",
          unpaid: "past_due",
          paused: "past_due",
        };

        const mappedStatus =
          statusMap[subscription.status] ?? "active";

        await getSupabaseAdmin()
          .from("profiles")
          .update({
            subscription_status: mappedStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.user_id;

        let targetUserId = userId;

        if (!targetUserId) {
          const customerId =
            typeof subscription.customer === "string"
              ? subscription.customer
              : subscription.customer.toString();

          const { data: profile } = await getSupabaseAdmin()
            .from("profiles")
            .select("id")
            .eq("stripe_customer_id", customerId)
            .single();

          if (!profile) {
            break;
          }

          targetUserId = profile.id;
        }

        await getSupabaseAdmin()
          .from("profiles")
          .update({
            subscription_tier: "free",
            subscription_status: "canceled",
            stripe_subscription_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", targetUserId);

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.toString();

        if (!customerId) {
          break;
        }

        const { data: profile } = await getSupabaseAdmin()
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (!profile) {
          break;
        }

        await getSupabaseAdmin()
          .from("profiles")
          .update({
            subscription_status: "past_due",
            updated_at: new Date().toISOString(),
          })
          .eq("id", profile.id);

        break;
      }

      default:
        // Unhandled event type -- acknowledge receipt
        break;
    }
  } catch (err) {
    // Log the error for debugging, but return 200 to prevent Stripe from
    // retrying on application errors (which could cause duplicate processing).
    console.error(
      "Stripe webhook processing error:",
      event.type,
      err instanceof Error ? err.message : err
    );
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 200 }
    );
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
