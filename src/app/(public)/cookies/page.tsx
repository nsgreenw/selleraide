import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cookie Policy | SellerAide",
  description: "SellerAide cookie policy — how we use cookies and tracking technologies.",
};

export default function CookiePolicy() {
  return (
    <div className="legal-page">
      <h1>Cookie Policy</h1>
      <p className="legal-effective">Effective Date: February 21, 2026</p>

      <p>
        This Cookie Policy explains how SellerAide (&quot;we,&quot; &quot;us,&quot; or
        &quot;our&quot;) uses cookies and similar tracking technologies on our website at{" "}
        <Link href="https://selleraide.vercel.app" className="text-sa-200 hover:underline">
          selleraide.vercel.app
        </Link>.
      </p>

      <h2>What Are Cookies?</h2>
      <p>
        Cookies are small text files stored on your device by your web browser. They help websites
        remember your preferences, maintain sessions, and collect usage data.
      </p>

      <h2>Cookies We Use</h2>

      <h3>Essential Cookies</h3>
      <p>
        These cookies are required for the Service to function and cannot be disabled.
      </p>
      <ul>
        <li><strong>Supabase Auth Session</strong> — Maintains your login session. Expires when you sign out or after the session timeout.</li>
      </ul>

      <h3>Analytics Cookies</h3>
      <p>
        These cookies help us understand how visitors interact with the Service.
      </p>
      <ul>
        <li><strong>Google Analytics (GA4)</strong> — Collects anonymized usage data including pages visited, session duration, and device information. Cookies include <code>_ga</code>, <code>_ga_*</code>. Retention: up to 14 months.</li>
      </ul>

      <h3>Marketing Cookies</h3>
      <p>
        These cookies are used to deliver relevant advertising and measure campaign effectiveness.
      </p>
      <ul>
        <li><strong>Meta Pixel (Facebook)</strong> — Tracks conversions from Facebook/Instagram ads and builds retargeting audiences. Cookies include <code>_fbp</code>, <code>_fbc</code>. Retention: up to 90 days.</li>
      </ul>

      <h2>How to Manage Cookies</h2>
      <p>
        You can control cookies through your browser settings. Most browsers allow you to block or
        delete cookies. Note that disabling essential cookies may prevent you from using the Service.
      </p>
      <ul>
        <li><strong>Chrome:</strong> Settings → Privacy and Security → Cookies</li>
        <li><strong>Firefox:</strong> Settings → Privacy &amp; Security → Cookies</li>
        <li><strong>Safari:</strong> Preferences → Privacy → Cookies</li>
        <li><strong>Edge:</strong> Settings → Cookies and Site Permissions</li>
      </ul>
      <p>
        To opt out of Google Analytics, install the{" "}
        <a
          href="https://tools.google.com/dlpage/gaoptout"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sa-200 hover:underline"
        >
          Google Analytics Opt-out Browser Add-on
        </a>.
      </p>
      <p>
        To opt out of Meta Pixel tracking, adjust your{" "}
        <a
          href="https://www.facebook.com/settings?tab=ads"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sa-200 hover:underline"
        >
          Facebook Ad Preferences
        </a>.
      </p>

      <h2>Changes to This Policy</h2>
      <p>
        We may update this Cookie Policy from time to time. Changes will be posted on this page with
        an updated effective date.
      </p>

      <h2>Contact Us</h2>
      <p>
        Questions about our use of cookies? Contact us at:{" "}
        <a href="mailto:support@selleraide.com" className="text-sa-200 hover:underline">support@selleraide.com</a>
      </p>

      <p>
        See also our{" "}
        <Link href="/privacy" className="text-sa-200 hover:underline">Privacy Policy</Link>.
      </p>
    </div>
  );
}
