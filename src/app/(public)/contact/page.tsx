import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact | SellerAide",
  description: "Get in touch with the SellerAide team for support, billing, or feedback.",
};

export default function ContactPage() {
  return (
    <div className="legal-page">
      <h1>Contact Us</h1>
      <p>
        Got a question, bug report, or feedback? We read every email.
      </p>

      <h2>Email</h2>
      <p>
        For support, billing questions, or feedback:
      </p>
      <p>
        <a href="mailto:support@selleraide.com" className="text-sa-200 hover:underline text-lg font-medium">
          support@selleraide.com
        </a>
      </p>
      <p className="text-sm text-zinc-500">
        We typically respond within 1 business day.
      </p>

      <h2>Common Questions</h2>

      <h3>How do I cancel my subscription?</h3>
      <p>
        Go to Settings → Billing → Cancel. You keep access through your billing
        period. See our{" "}
        <Link href="/refunds" className="text-sa-200 hover:underline">
          Refund &amp; Cancellation Policy
        </Link>.
      </p>

      <h3>How do I delete my account?</h3>
      <p>
        Go to Settings → Account → Delete Account. All your data is removed
        within 30 days.
      </p>

      <h3>I found a bug.</h3>
      <p>
        Email us with what happened, what you expected, and a screenshot if
        possible. We fix things fast.
      </p>

      <h3>Can I use SellerAide for marketplaces other than Amazon and eBay?</h3>
      <p>
        Not yet — Amazon and eBay are our focus. We&apos;ll announce new
        marketplace support when it&apos;s ready.
      </p>

      <p className="mt-8 text-sm text-zinc-500">
        SellerAide is built by a small team. Real humans read your emails.
      </p>

      <p className="mt-6">
        <Link href="/" className="text-sa-200 hover:underline text-sm">
          ← Back to SellerAide
        </Link>
      </p>
    </div>
  );
}
