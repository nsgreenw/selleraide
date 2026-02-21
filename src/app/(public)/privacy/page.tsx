import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | SellerAide",
  description: "SellerAide privacy policy — how we collect, use, and protect your data.",
};

export default function PrivacyPolicy() {
  return (
    <div className="legal-page">
      <h1>Privacy Policy</h1>
      <p className="legal-effective">Effective Date: February 21, 2026</p>

      <p>
        SellerAide (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates the website at{" "}
        <Link href="https://selleraide.vercel.app" className="text-sa-200 hover:underline">
          selleraide.vercel.app
        </Link>{" "}
        (the &quot;Service&quot;). This Privacy Policy explains how we collect, use, disclose, and
        safeguard your information when you use our Service.
      </p>

      <h2>1. Information We Collect</h2>

      <h3>Account Information</h3>
      <p>
        When you create an account, we collect your email address and password (hashed). You may
        also provide a display name or business name.
      </p>

      <h3>Listing &amp; Conversation Data</h3>
      <p>
        When you use our AI listing generator, we store your conversation history, product
        descriptions, generated listings, and associated metadata (marketplace, keywords, scores).
      </p>

      <h3>Payment Information</h3>
      <p>
        Subscription billing is processed by Stripe. We do not store your full credit card number.
        Stripe provides us with a token, card type, last four digits, and billing address for
        record-keeping.
      </p>

      <h3>Usage &amp; Analytics Data</h3>
      <p>
        We automatically collect usage data including pages visited, features used, listing counts,
        browser type, device information, IP address, and referring URLs through Google Analytics
        (GA4) and Meta Pixel.
      </p>

      <h2>2. How We Use Your Information</h2>
      <ul>
        <li><strong>Service Delivery:</strong> To operate your account, generate listings, and manage subscriptions.</li>
        <li><strong>AI Processing:</strong> Your product descriptions are sent to Google Gemini API to generate and optimize listings. We do not use your data to train AI models.</li>
        <li><strong>Analytics:</strong> To understand usage patterns and improve the Service.</li>
        <li><strong>Marketing:</strong> To deliver relevant advertising via Meta Pixel and communicate product updates via email (with your consent).</li>
        <li><strong>Security:</strong> To detect and prevent fraud, abuse, and unauthorized access.</li>
      </ul>

      <h2>3. Third-Party Services</h2>
      <p>We share data with the following third-party service providers:</p>
      <ul>
        <li><strong>Supabase</strong> — Authentication and database hosting (stores account data, conversations, and listings).</li>
        <li><strong>Stripe</strong> — Payment processing and subscription management.</li>
        <li><strong>Google Gemini API</strong> — AI-powered listing generation. Product descriptions you provide are sent to Google&apos;s servers for processing.</li>
        <li><strong>Google Analytics (GA4)</strong> — Website analytics and usage tracking.</li>
        <li><strong>Meta Pixel (Facebook)</strong> — Advertising conversion tracking and audience building.</li>
        <li><strong>Vercel</strong> — Application hosting and content delivery.</li>
      </ul>

      <h2>4. Cookies &amp; Tracking Technologies</h2>
      <p>We use the following cookies and tracking technologies:</p>
      <ul>
        <li><strong>Essential Cookies:</strong> Supabase authentication session tokens required for the Service to function.</li>
        <li><strong>Analytics Cookies:</strong> Google Analytics (GA4) cookies to measure site usage and performance.</li>
        <li><strong>Marketing Cookies:</strong> Meta Pixel cookies for advertising measurement and retargeting.</li>
      </ul>
      <p>
        For more details, see our{" "}
        <Link href="/cookies" className="text-sa-200 hover:underline">Cookie Policy</Link>.
      </p>

      <h2>5. Data Retention &amp; Deletion</h2>
      <p>
        We retain your account data and generated listings for as long as your account is active.
        Conversation history is retained for up to 12 months after the last interaction. Payment
        records are retained as required by law (typically 7 years for tax purposes).
      </p>
      <p>
        You may delete your account at any time through your account settings. Upon deletion, we
        will remove your personal data within 30 days, except where retention is required by law.
      </p>

      <h2>6. Your Rights</h2>
      <p>Depending on your jurisdiction, you may have the right to:</p>
      <ul>
        <li><strong>Access</strong> the personal data we hold about you.</li>
        <li><strong>Delete</strong> your personal data and account.</li>
        <li><strong>Export</strong> your data in a portable format (listings are exportable as PDF/CSV).</li>
        <li><strong>Correct</strong> inaccurate personal information.</li>
        <li><strong>Object</strong> to certain processing activities, including marketing.</li>
        <li><strong>Withdraw Consent</strong> for optional data processing at any time.</li>
      </ul>
      <p>
        To exercise any of these rights, contact us at{" "}
        <a href="mailto:support@selleraide.com" className="text-sa-200 hover:underline">support@selleraide.com</a>.
      </p>

      <h2>7. California Privacy Rights (CCPA)</h2>
      <p>
        If you are a California resident, you have the right to know what personal information we
        collect, request its deletion, and opt out of the sale of your personal information. We do
        not sell personal information. To make a request, email{" "}
        <a href="mailto:support@selleraide.com" className="text-sa-200 hover:underline">support@selleraide.com</a>.
      </p>

      <h2>8. International Users (GDPR)</h2>
      <p>
        If you are located in the European Economic Area, the United Kingdom, or Switzerland, we
        process your data based on: (a) your consent, (b) contractual necessity to provide the
        Service, or (c) our legitimate interests. You have the right to lodge a complaint with your
        local supervisory authority.
      </p>

      <h2>9. Children&apos;s Privacy</h2>
      <p>
        The Service is not directed to children under 13 years of age. We do not knowingly collect
        personal information from children under 13. If you believe we have collected data from a
        child, please contact us immediately.
      </p>

      <h2>10. Security</h2>
      <p>
        We implement industry-standard security measures including encryption in transit (TLS),
        hashed passwords, row-level security policies, and secure API authentication. However, no
        method of electronic transmission or storage is 100% secure.
      </p>

      <h2>11. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. We will notify you of material changes
        by posting the updated policy on this page and updating the effective date. Your continued
        use of the Service after changes constitutes acceptance.
      </p>

      <h2>12. Contact Us</h2>
      <p>
        If you have questions about this Privacy Policy, contact us at:{" "}
        <a href="mailto:support@selleraide.com" className="text-sa-200 hover:underline">support@selleraide.com</a>
      </p>
    </div>
  );
}
