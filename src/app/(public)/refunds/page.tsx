import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy | SellerAide",
  description: "SellerAide refund and cancellation policy — how billing, cancellations, and refunds work.",
};

export default function RefundsPage() {
  return (
    <div className="legal-page">
      <h1>Refund &amp; Cancellation Policy</h1>
      <p className="legal-effective">Effective Date: February 21, 2026</p>

      <h2>Free Trial</h2>
      <p>
        Your first 7 days are free. A payment method is required to start the trial.
        If you do not cancel before the trial ends, your selected plan automatically
        begins and your card is charged.
      </p>

      <h2>Cancellation</h2>
      <ul>
        <li>Cancel anytime from <strong>Settings → Billing</strong>.</li>
        <li>You keep access through the end of your current billing period.</li>
        <li>No cancellation fees.</li>
        <li>After your period ends, your account reverts to read-only. Your data is retained for 90 days.</li>
      </ul>

      <h2>Monthly Plans</h2>
      <p>
        Monthly plans are not prorated. If you cancel mid-cycle, you retain access
        until the billing period ends. If something went wrong — a billing error or
        inability to use the product — email us and we&apos;ll make it right.
      </p>

      <h2>Annual Plans</h2>
      <p>
        Annual plans can be refunded within the first 30 days if you&apos;re not
        satisfied. After 30 days, you may cancel but the remaining balance is not
        refunded — you keep access through the end of your annual term.
      </p>

      <h2>How to Request a Refund</h2>
      <p>
        Email{" "}
        <a href="mailto:support@selleraide.com" className="text-sa-200 hover:underline">
          support@selleraide.com
        </a>{" "}
        with your account email and the reason for your request. We respond within
        2 business days. Approved refunds are processed to your original payment
        method within 5–10 business days.
      </p>

      <h2>Our Promise</h2>
      <p>
        We&apos;d rather lose a subscription than have an unhappy customer. If you
        feel like you got a raw deal, talk to us. We&apos;re reasonable people.
      </p>

      <p className="mt-8 text-sm text-zinc-500">
        Questions?{" "}
        <a href="mailto:support@selleraide.com" className="text-sa-200 hover:underline">
          support@selleraide.com
        </a>
      </p>

      <p className="mt-6">
        <Link href="/" className="text-sa-200 hover:underline text-sm">
          ← Back to SellerAide
        </Link>
      </p>
    </div>
  );
}
