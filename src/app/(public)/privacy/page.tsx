import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | SellerAide",
  description: "SellerAide privacy policy — how we collect, use, and protect your data.",
};

// Last updated: 2026-02-24

export default function PrivacyPolicy() {
  return (
    <div className="legal-page">
      <h1>Privacy Policy</h1>
      <p className="legal-effective">Effective Date: February 21, 2026 · Last Updated: February 24, 2026</p>

      <p>
        SellerAide (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates the website at{" "}
        <Link href="https://selleraide.com" className="text-sa-200 hover:underline">
          selleraide.com
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
        <li><strong>Service Delivery:</strong> To operate your account, audit listings, and manage subscriptions.</li>
        <li><strong>AI Processing:</strong> Your product descriptions are sent to Google Gemini API to draft and optimize listings. We do not use your data to train AI models.</li>
        <li><strong>Analytics:</strong> To understand usage patterns and improve the Service.</li>
        <li><strong>Marketing:</strong> To deliver relevant advertising via Meta Pixel and communicate product updates via email (with your consent).</li>
        <li><strong>Security:</strong> To detect and prevent fraud, abuse, and unauthorized access.</li>
      </ul>

      <h2>3. Third-Party Services</h2>
      <p>We share data with the following third-party service providers:</p>
      <ul>
        <li><strong>Supabase</strong> — Authentication and database hosting (stores account data, conversations, and listings).</li>
        <li><strong>Stripe</strong> — Payment processing and subscription management.</li>
        <li><strong>Google Gemini API</strong> — AI-powered listing generation and optimization. Product descriptions you provide are sent to Google&apos;s servers for processing.</li>
        <li><strong>eBay Developer API</strong> — When you connect your eBay seller account, we use the eBay API to create draft listings on your behalf. See Section 4 for full details.</li>
        <li><strong>Google Analytics (GA4)</strong> — Website analytics and usage tracking.</li>
        <li><strong>Meta Pixel (Facebook)</strong> — Advertising conversion tracking and audience building.</li>
        <li><strong>Vercel</strong> — Application hosting and content delivery.</li>
      </ul>

      <h2>4. eBay Marketplace Account Connection</h2>
      <p>
        SellerAide offers an optional integration that allows you to connect your eBay seller account
        and send AI-generated listings directly to your eBay drafts. This integration uses eBay&apos;s
        official OAuth 2.0 authorization flow and developer APIs.
      </p>
      <ul>
        <li><strong>What we access:</strong> When you authorize the connection, we receive permission to create and manage inventory items and offers (draft listings) on your eBay account. We do not access your eBay order history, buyer information, payment details, or any data beyond what is necessary to create listings.</li>
        <li><strong>What we store:</strong> We store your eBay User ID and encrypted OAuth tokens (access token and refresh token) in our database to maintain the connection across sessions. Tokens are encrypted at rest.</li>
        <li><strong>How we use it:</strong> OAuth tokens are used solely to create draft listings on your behalf via the eBay API. We do not use your eBay credentials for any other purpose.</li>
        <li><strong>Token expiry:</strong> Access tokens expire after 2 hours and are refreshed automatically. Refresh tokens expire after approximately 18 months and will require you to reconnect.</li>
        <li><strong>How to disconnect:</strong> You can revoke eBay access at any time from your SellerAide account settings. Upon disconnection, we permanently delete your stored eBay tokens. You may also revoke access directly from your eBay account under Account Settings → Third-Party Authorizations.</li>
        <li><strong>eBay account deletion:</strong> If you close your eBay account, we will delete all associated tokens and connection data from our systems within 30 days of receiving notification from eBay.</li>
      </ul>

      <h2>5. Browser Extension</h2>
      <p>
        The SellerAide Chrome extension (&quot;Extension&quot;) is an optional companion tool available
        on the Chrome Web Store. The Extension operates as follows:
      </p>
      <ul>
        <li><strong>What it reads:</strong> When you click the SellerAide icon on an Amazon or eBay product page, the Extension reads the visible listing content from that page — including the product title, bullet points, description, and item specifics. This content is referred to as &quot;Listing Data.&quot;</li>
        <li><strong>When it reads:</strong> Listing Data is only read in response to an explicit user action (clicking the Extension icon). The Extension does not monitor your browsing, read pages passively, or collect data in the background.</li>
        <li><strong>What it does with the data:</strong> Listing Data is passed directly to selleraide.com/audit where it is analyzed for quality, compliance, and keyword optimization. If you are signed in, you may choose to save the results to your SellerAide account. Listing Data is not stored by the Extension itself.</li>
        <li><strong>What it does not collect:</strong> The Extension does not collect your browsing history, search queries, personal information, purchase history, pricing data, or any information about pages you visit other than the current Amazon or eBay listing you explicitly choose to audit.</li>
        <li><strong>Presence detection:</strong> A content script also runs on selleraide.com solely to signal to the web app that the Extension is installed. No data is read or transmitted in this context.</li>
      </ul>

      <h2>6. Amazon Data Protection Policy</h2>
      <p>
        SellerAide is committed to protecting the privacy of Amazon Sellers and Customers. In compliance with Amazon&apos;s Data Protection Policy:
      </p>
      <ul>
        <li>We do not request, access, or store Personally Identifiable Information (PII) of Amazon Customers (such as names, shipping addresses, or phone numbers).</li>
        <li>We do not sell, rent, or trade any data retrieved via Amazon Services APIs (SP-API or MWS).</li>
        <li>Data retrieved from Amazon is used solely for the purpose of providing analytics and listing optimization tools to the authorized Seller.</li>
        <li>We maintain strict access controls and encryption standards to protect Seller data.</li>
      </ul>

      <h2>7. Cookies &amp; Tracking Technologies</h2>
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

      <h2>8. Data Retention &amp; Deletion</h2>
      <p>
        We retain your account data and generated listings for as long as your account is active.
        Conversation history is retained for up to 12 months after the last interaction. Payment
        records are retained as required by law (typically 7 years for tax purposes).
      </p>
      <p>
        You may delete your account at any time through your account settings. Upon deletion, we
        will remove your personal data within 30 days, except where retention is required by law.
      </p>

      <h2>9. Your Rights</h2>
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

      <h2>10. California Privacy Rights (CCPA)</h2>
      <p>
        If you are a California resident, you have the right to know what personal information we
        collect, request its deletion, and opt out of the sale of your personal information. We do
        not sell personal information. To make a request, email{" "}
        <a href="mailto:support@selleraide.com" className="text-sa-200 hover:underline">support@selleraide.com</a>.
      </p>

      <h2>11. International Users (GDPR)</h2>
      <p>
        If you are located in the European Economic Area, the United Kingdom, or Switzerland, we
        process your data based on: (a) your consent, (b) contractual necessity to provide the
        Service, or (c) our legitimate interests. You have the right to lodge a complaint with your
        local supervisory authority.
      </p>

      <h2>12. Children&apos;s Privacy</h2>
      <p>
        The Service is not directed to children under 13 years of age. We do not knowingly collect
        personal information from children under 13. If you believe we have collected data from a
        child, please contact us immediately.
      </p>

      <h2>13. Security</h2>
      <p>
        We implement industry-standard security measures including encryption in transit (TLS),
        hashed passwords, row-level security policies, and secure API authentication. However, no
        method of electronic transmission or storage is 100% secure.
      </p>

      <h2>14. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. We will notify you of material changes
        by posting the updated policy on this page and updating the effective date. Your continued
        use of the Service after changes constitutes acceptance.
      </p>

      <h2>15. Contact Us</h2>
      <p>
        If you have questions about this Privacy Policy, contact us at:{" "}
        <a href="mailto:support@selleraide.com" className="text-sa-200 hover:underline">support@selleraide.com</a>
      </p>
    </div>
  );
}
