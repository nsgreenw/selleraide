import { requireAuth } from "@/lib/api/auth-guard";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/subscription/stripe";

export async function POST() {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, 401);
  }
  const user = auth.user!;

  const supabase = await createClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return jsonError("Failed to fetch profile", 500);
  }

  if (!profile.stripe_customer_id) {
    return jsonError(
      "No billing account found. Please subscribe to a plan first.",
      400
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return jsonError("Application URL not configured. Set NEXT_PUBLIC_APP_URL.", 500);
  }

  const session = await getStripe().billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${appUrl}/settings/billing`,
  });

  return jsonSuccess({ url: session.url });
}
