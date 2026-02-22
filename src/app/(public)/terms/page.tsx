import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | SellerAide",
  description: "SellerAide terms of service — rules and guidelines for using our platform.",
};

export default function TermsOfService() {
  return (
    <div className="legal-page">
      <h1>Terms of Service</h1>
      <p className="legal-effective">Effective Date: February 21, 2026</p>

      <p>
        Welcome to SellerAide. By accessing or using our website at{" "}
        <Link href="https://selleraide.vercel.app" className="text-sa-200 hover:underline">
          selleraide.vercel.app
        </Link>{" "}
        (the &quot;Service&quot;), you agree to be bound by these Terms of Service
        (&quot;Terms&quot;). If you do not agree, do not use the Service.
      </p>

      <h2>1. Acceptance of Terms</h2>
      <p>
        By creating an account or using any part of the Service, you confirm that you are at least
        18 years old (or the age of majority in your jurisdiction) and agree to these Terms, our{" "}
        <Link href="/privacy" className="text-sa-200 hover:underline">Privacy Policy</Link>, our{" "}
        <Link href="/cookies" className="text-sa-200 hover:underline">Cookie Policy</Link>, and our{" "}
        <Link href="/acceptable-use" className="text-sa-200 hover:underline">Acceptable Use Policy</Link>.
      </p>

      <h2>2. Account Registration</h2>
      <p>
        You must register an account to use the Service. You are responsible for maintaining the
        confidentiality of your credentials and for all activities under your account. You agree to
        provide accurate information and notify us immediately of any unauthorized access.
      </p>

      <h2>3. Subscription Plans &amp; Billing</h2>
      <p>
        SellerAide offers paid subscription plans. Eligible self-serve plans include a 7-day free
        trial for new subscriptions. Plans are billed monthly through Stripe after the trial ends unless canceled.
        By subscribing, you authorize recurring charges until you cancel. Cancellation takes effect
        at the end of the current billing period. We reserve the right to change pricing with 30
        days&apos; notice.
      </p>
      <p>
        Refunds are handled on a case-by-case basis. Contact{" "}
        <a href="mailto:support@selleraide.com" className="text-sa-200 hover:underline">support@selleraide.com</a>{" "}
        for billing inquiries.
      </p>

      <h2>4. AI-Generated Content Disclaimer</h2>
      <p>
        SellerAide uses Anthropic Claude AI to generate product listings, keyword suggestions, and
        related content. <strong>AI-generated content is provided &quot;as is&quot; without any
        guarantee of accuracy, completeness, or fitness for a particular purpose.</strong>
      </p>
      <p>
        You are solely responsible for reviewing, editing, and approving all generated content
        before publishing it to any marketplace. SellerAide is not liable for any losses, listing
        removals, or marketplace penalties resulting from the use of AI-generated content.
      </p>

      <h2>5. Acceptable Use</h2>
      <p>
        You agree to use the Service in compliance with all applicable laws and our{" "}
        <Link href="/acceptable-use" className="text-sa-200 hover:underline">Acceptable Use Policy</Link>.
        You may not use the Service to generate listings for illegal, counterfeit, or prohibited
        products, or to abuse, overload, or interfere with the Service.
      </p>

      <h2>6. Intellectual Property</h2>
      <p>
        <strong>Your Content:</strong> You retain ownership of all product information you provide
        and the listings generated from your input. You grant us a limited license to process your
        content as necessary to provide the Service.
      </p>
      <p>
        <strong>Our Platform:</strong> SellerAide, its design, features, branding, and underlying
        technology are owned by us and protected by intellectual property laws. You may not copy,
        modify, distribute, or reverse-engineer any part of the Service.
      </p>

      <h2>7. Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by law, SellerAide and its affiliates shall not be liable
        for any indirect, incidental, special, consequential, or punitive damages, including but not
        limited to loss of profits, revenue, data, or marketplace standing, arising from your use of
        the Service.
      </p>
      <p>
        Our total liability for any claim arising from the Service shall not exceed the amount you
        paid us in the 12 months preceding the claim, or $100, whichever is greater.
      </p>

      <h2>8. Indemnification</h2>
      <p>
        You agree to indemnify and hold harmless SellerAide from any claims, damages, or expenses
        (including attorney fees) arising from your use of the Service, violation of these Terms, or
        infringement of any third-party rights.
      </p>

      <h2>9. Termination</h2>
      <p>
        We may suspend or terminate your account at any time for violation of these Terms or our
        Acceptable Use Policy, with or without notice. You may delete your account at any time
        through your account settings. Upon termination, your right to use the Service ceases
        immediately.
      </p>

      <h2>10. Governing Law</h2>
      <p>
        These Terms are governed by and construed in accordance with the laws of the State of
        Delaware, United States, without regard to conflict of law principles.
      </p>

      <h2>11. Dispute Resolution</h2>
      <p>
        Any disputes arising under these Terms shall first be resolved through good-faith
        negotiation. If unresolved, disputes shall be submitted to binding arbitration in accordance
        with the rules of the American Arbitration Association, conducted in the State of Delaware.
      </p>

      <h2>12. Changes to These Terms</h2>
      <p>
        We may update these Terms at any time. Material changes will be communicated via email or a
        prominent notice on the Service. Continued use after changes constitutes acceptance of the
        revised Terms.
      </p>

      <h2>13. Contact Us</h2>
      <p>
        Questions about these Terms? Contact us at:{" "}
        <a href="mailto:support@selleraide.com" className="text-sa-200 hover:underline">support@selleraide.com</a>
      </p>
    </div>
  );
}
