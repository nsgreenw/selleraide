import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Acceptable Use Policy | SellerAide",
  description: "SellerAide acceptable use policy — rules for responsible use of our platform.",
};

export default function AcceptableUsePolicy() {
  return (
    <div className="legal-page">
      <h1>Acceptable Use Policy</h1>
      <p className="legal-effective">Effective Date: February 21, 2026</p>

      <p>
        This Acceptable Use Policy (&quot;AUP&quot;) governs your use of the SellerAide platform.
        By using the Service, you agree to comply with this policy. Violations may result in account
        suspension or termination.
      </p>

      <h2>1. Prohibited Products &amp; Content</h2>
      <p>You may not use SellerAide to create listings for:</p>
      <ul>
        <li>Counterfeit, stolen, or illegally obtained goods</li>
        <li>Controlled substances, illegal drugs, or drug paraphernalia</li>
        <li>Weapons, explosives, or ammunition (where prohibited)</li>
        <li>Products that infringe on intellectual property rights</li>
        <li>Recalled or banned consumer products</li>
        <li>Products promoting hate, violence, or discrimination</li>
        <li>Fraudulent, misleading, or deceptive product descriptions</li>
        <li>Any products prohibited by applicable law</li>
      </ul>

      <h2>2. Prohibited Activities</h2>
      <p>You may not:</p>
      <ul>
        <li>Attempt to reverse-engineer, scrape, or extract data from the Service</li>
        <li>Use automated tools (bots, scrapers) to access the Service beyond normal use</li>
        <li>Circumvent rate limits, usage quotas, or other technical restrictions</li>
        <li>Interfere with or disrupt the Service or its infrastructure</li>
        <li>Use the Service to spam, phish, or distribute malware</li>
        <li>Impersonate another person or entity</li>
        <li>Exploit the AI system to generate harmful, abusive, or illegal content</li>
      </ul>

      <h2>3. Rate Limiting &amp; Abuse</h2>
      <p>
        Each subscription tier includes defined usage limits (listing generations per billing
        period). Attempting to circumvent these limits, exploit free-tier allocations through
        multiple accounts, or overload the system constitutes abuse and may result in immediate
        account termination.
      </p>

      <h2>4. Account Sharing</h2>
      <p>
        Your account is personal to you. You may not share your login credentials with others or
        allow multiple individuals to use a single account, unless your subscription plan explicitly
        permits team access. Shared accounts detected in violation may be suspended.
      </p>

      <h2>5. Marketplace Compliance</h2>
      <p>
        You are solely responsible for ensuring that all listings created with SellerAide comply with
        the terms of service, seller policies, and content guidelines of the marketplaces where you
        publish them, including but not limited to:
      </p>
      <ul>
        <li>Amazon Seller Central policies</li>
        <li>eBay listing policies</li>
        <li>Walmart Marketplace seller agreement</li>
        <li>Shopify acceptable use policy</li>
      </ul>
      <p>
        SellerAide is not responsible for listing removals, account suspensions, or penalties imposed
        by any marketplace.
      </p>

      <h2>6. Reporting Violations</h2>
      <p>
        If you become aware of any violation of this policy, please report it to{" "}
        <a href="mailto:support@selleraide.com" className="text-sa-200 hover:underline">support@selleraide.com</a>.
      </p>

      <h2>7. Enforcement</h2>
      <p>
        We reserve the right to investigate and take action against any violations, including
        warning, suspension, or permanent termination of your account. We may also report illegal
        activities to law enforcement authorities.
      </p>
    </div>
  );
}
