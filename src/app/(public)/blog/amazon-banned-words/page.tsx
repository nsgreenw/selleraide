import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Amazon Banned Words List 2026 — Complete Seller Guide | SellerAide",
  description:
    "The complete list of banned words and restricted phrases that cause Amazon listing suppression in 2026. Plus eBay, Walmart, and Shopify restricted terms. Updated February 2026.",
  keywords: [
    "amazon banned words",
    "amazon restricted phrases",
    "amazon listing suppressed",
    "amazon prohibited words",
    "amazon listing policy",
    "ebay banned words",
    "walmart banned words",
    "listing compliance",
    "listing suppression",
  ],
  openGraph: {
    title: "Amazon Banned Words List 2026 — Complete Seller Guide",
    description:
      "The complete list of banned words that cause Amazon listing suppression. Plus eBay, Walmart, and Shopify restricted terms.",
    type: "article",
    publishedTime: "2026-02-26T00:00:00Z",
    authors: ["SellerAide"],
  },
  alternates: {
    canonical: "https://selleraide.com/blog/amazon-banned-words",
  },
};

const EXTENSION_URL = process.env.NEXT_PUBLIC_EXTENSION_URL || null;

/* ── Banned term data (mirrors src/lib/marketplace/*.ts) ── */

type Term = {
  term: string;
  severity: "error" | "warning";
  reason: string;
};

const AMAZON_TERMS: Term[] = [
  { term: "#1", severity: "error", reason: "Unsubstantiated ranking claims violate Amazon product listing policies" },
  { term: "number one", severity: "error", reason: "Unsubstantiated ranking claims violate Amazon product listing policies" },
  { term: "best seller", severity: "error", reason: "Only Amazon can award Best Seller badges — claiming this status is prohibited" },
  { term: "guarantee / guaranteed", severity: "error", reason: "Guarantee claims require substantiation and are restricted by Amazon policies" },
  { term: "100%", severity: "error", reason: "Absolute percentage claims are considered unsubstantiated and may trigger listing suppression" },
  { term: "free shipping", severity: "error", reason: "Shipping terms are controlled by Amazon — mentioning shipping in listing content is prohibited" },
  { term: "act now", severity: "error", reason: "Urgency-based pressure tactics are not allowed in Amazon product listings" },
  { term: "limited time", severity: "error", reason: "Time-sensitive claims create false urgency and violate listing policies" },
  { term: "FDA approved", severity: "error", reason: "FDA approval claims require official authorization and are strictly regulated" },
  { term: "clinically proven", severity: "error", reason: "Medical efficacy claims require clinical evidence and regulatory clearance" },
  { term: "cure / treats", severity: "error", reason: "Medical treatment claims are prohibited unless the product is an approved drug or device" },
  { term: "Emojis", severity: "error", reason: "Emojis are not allowed in Amazon product listing content — use plain text only" },
  { term: "cheap", severity: "warning", reason: "Undermines perceived value and can trigger quality concerns during review" },
  { term: "buy now", severity: "warning", reason: "Transactional CTAs in listing content are discouraged by Amazon style guidelines" },
  { term: "hurry", severity: "warning", reason: "Urgency language is discouraged and may be flagged during listing review" },
];

const EBAY_TERMS: Term[] = [
  { term: "fake", severity: "error", reason: "Implies inauthenticity — eBay VeRO program strictly prohibits counterfeit-related terminology" },
  { term: "replica", severity: "error", reason: "Replica listings violate eBay counterfeit goods policy and may result in account suspension" },
  { term: "counterfeit", severity: "error", reason: "Counterfeit references violate eBay VeRO intellectual property policy" },
  { term: "knockoff", severity: "error", reason: "Implies the product is an unauthorized copy, which violates eBay listing policies" },
  { term: "unauthorized", severity: "error", reason: "Suggests the item is not legitimately sourced, creating trust and policy issues" },
  { term: "#1 / guarantee / 100%", severity: "error", reason: "Unsubstantiated claims are not permitted on eBay listings" },
  { term: "free shipping", severity: "warning", reason: "Shipping terms should be configured in listing settings, not mentioned in description text" },
  { term: "act now / limited time", severity: "warning", reason: "High-pressure urgency language is discouraged — eBay auctions already have natural urgency" },
  { term: "Emojis", severity: "warning", reason: "Emojis may render inconsistently across eBay platforms and are best avoided" },
];

const WALMART_TERMS: Term[] = [
  { term: "Amazon / Prime", severity: "error", reason: "References to competing marketplaces are strictly prohibited on Walmart listings" },
  { term: "cheap", severity: "error", reason: "Walmart positions on value, not cheapness — use 'affordable' or 'great value' instead" },
  { term: "best seller / #1", severity: "error", reason: "Unsubstantiated ranking claims are not permitted on Walmart Marketplace" },
  { term: "guarantee / 100%", severity: "error", reason: "Guarantee claims require substantiation — use specific warranty terms instead" },
  { term: "limited time / free shipping", severity: "error", reason: "Promotional urgency language and shipping references are not allowed in product content" },
  { term: "FDA approved / clinically proven", severity: "error", reason: "Medical claims require regulatory authorization documentation" },
  { term: "Emojis", severity: "error", reason: "Emojis are not allowed in Walmart Marketplace listing content" },
];

const SHOPIFY_TERMS: Term[] = [
  { term: "cure / clinically proven", severity: "error", reason: "Medical claims are prohibited for non-pharmaceutical products — violates FTC guidelines" },
  { term: "FDA approved", severity: "error", reason: "FDA approval claims require official regulatory authorization — misuse carries legal liability" },
  { term: "buy now or miss out", severity: "error", reason: "Aggressive scarcity CTAs erode trust on DTC stores — use value-driven CTAs instead" },
  { term: "miracle", severity: "error", reason: "Superlative claims without evidence are flagged by advertising standards" },
  { term: "100% guarantee / guaranteed results", severity: "error", reason: "Absolute guarantee claims are risky for FTC compliance and consumer protection laws" },
  { term: "cheap", severity: "warning", reason: "On DTC stores, 'cheap' undermines brand perception — use 'affordable' or 'great value'" },
  { term: "hurry / limited stock", severity: "warning", reason: "False scarcity claims violate FTC truth-in-advertising guidelines unless factually accurate" },
];

function TermTable({ terms, marketplace }: { terms: Term[]; marketplace: string }) {
  return (
    <div className="overflow-x-auto mb-8">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left py-3 px-4 text-zinc-400 font-medium">Word / Phrase</th>
            <th className="text-left py-3 px-4 text-zinc-400 font-medium w-24">Risk</th>
            <th className="text-left py-3 px-4 text-zinc-400 font-medium">Why It&apos;s Banned</th>
          </tr>
        </thead>
        <tbody>
          {terms.map((t) => (
            <tr key={`${marketplace}-${t.term}`} className="border-b border-white/5 hover:bg-white/[0.02]">
              <td className="py-3 px-4 font-mono text-sa-200 text-sm whitespace-nowrap">
                {t.term}
              </td>
              <td className="py-3 px-4">
                {t.severity === "error" ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-400 bg-red-500/10 rounded-full px-2.5 py-0.5">
                    Suppression
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400 bg-amber-500/10 rounded-full px-2.5 py-0.5">
                    Warning
                  </span>
                )}
              </td>
              <td className="py-3 px-4 text-zinc-400">{t.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CTABox() {
  return (
    <div
      className="rounded-xl border border-sa-200/20 p-6 sm:p-8 my-10"
      style={{
        background:
          "radial-gradient(circle at 50% 0%, rgba(246,203,99,0.06), transparent 60%)",
      }}
    >
      <p className="label-kicker text-sa-200 mb-3">FREE TOOL</p>
      <h3 className="text-xl font-semibold text-zinc-100 mb-2">
        Scan any listing for banned words instantly
      </h3>
      <p className="text-zinc-400 text-sm mb-5">
        The SellerAide Chrome extension audits any Amazon or eBay listing in seconds.
        Get a 0&ndash;100 quality score, see every banned term flagged, and fix issues before
        they cause suppression. No signup required.
      </p>
      <div className="flex flex-wrap gap-3">
        {EXTENSION_URL ? (
          <a href={EXTENSION_URL} target="_blank" rel="noopener noreferrer" className="btn-primary text-sm">
            Install Free Extension
          </a>
        ) : (
          <Link href="/audit" className="btn-primary text-sm">
            Try the Free Audit Tool
          </Link>
        )}
        <Link href="/signup" className="btn-secondary text-sm">
          Start 7-Day Free Trial
        </Link>
      </div>
    </div>
  );
}

export default function AmazonBannedWordsPage() {
  return (
    <article className="max-w-3xl mx-auto px-6 py-16">
      {/* ── Breadcrumb ── */}
      <nav className="mb-8" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-xs text-zinc-500">
          <li>
            <Link href="/" className="hover:text-zinc-300">Home</Link>
          </li>
          <li>/</li>
          <li>
            <Link href="/blog" className="hover:text-zinc-300">Blog</Link>
          </li>
          <li>/</li>
          <li className="text-zinc-400">Amazon Banned Words</li>
        </ol>
      </nav>

      {/* ── Header ── */}
      <header className="mb-12">
        <p className="label-kicker text-sa-200 mb-4">SELLER COMPLIANCE</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-zinc-100 tracking-tight mb-4">
          Amazon Banned Words List 2026: The Complete Guide for Sellers
        </h1>
        <p className="text-zinc-400 text-lg leading-relaxed mb-4">
          Using the wrong word in your Amazon listing can get it silently suppressed &mdash;
          no warning, no email, just zero impressions. Here&apos;s every word and phrase
          that triggers suppression across Amazon, eBay, Walmart, and Shopify in 2026.
        </p>
        <div className="flex items-center gap-4 text-xs text-zinc-500">
          <time dateTime="2026-02-26">February 26, 2026</time>
          <span>&middot;</span>
          <span>12 min read</span>
          <span>&middot;</span>
          <span>Updated monthly</span>
        </div>
      </header>

      {/* ── Table of Contents ── */}
      <div className="card-glass p-5 mb-12">
        <p className="label-kicker text-zinc-500 mb-3">IN THIS ARTICLE</p>
        <ol className="space-y-1.5 text-sm">
          <li><a href="#what-happens" className="text-zinc-400 hover:text-sa-200">1. What happens when you use a banned word</a></li>
          <li><a href="#amazon" className="text-zinc-400 hover:text-sa-200">2. Amazon banned words (15 errors, 3 warnings)</a></li>
          <li><a href="#ebay" className="text-zinc-400 hover:text-sa-200">3. eBay restricted terms</a></li>
          <li><a href="#walmart" className="text-zinc-400 hover:text-sa-200">4. Walmart restricted terms</a></li>
          <li><a href="#shopify" className="text-zinc-400 hover:text-sa-200">5. Shopify / DTC restricted terms</a></li>
          <li><a href="#cross-marketplace" className="text-zinc-400 hover:text-sa-200">6. Cross-marketplace comparison</a></li>
          <li><a href="#how-to-check" className="text-zinc-400 hover:text-sa-200">7. How to check your listings automatically</a></li>
          <li><a href="#safe-alternatives" className="text-zinc-400 hover:text-sa-200">8. Safe alternatives for common banned phrases</a></li>
        </ol>
      </div>

      {/* ── Section 1: What Happens ── */}
      <section id="what-happens" className="mb-14">
        <h2 className="text-2xl font-semibold text-zinc-100 mb-4">
          What happens when you use a banned word
        </h2>
        <p className="text-zinc-400 leading-relaxed mb-4">
          Amazon doesn&apos;t always tell you when your listing is suppressed. The product stays in
          your catalog, your inventory is still counted, but it <strong className="text-zinc-200">stops appearing in search results</strong>.
          You&apos;ll see impressions drop to zero while your dashboard shows everything is &quot;active.&quot;
        </p>
        <p className="text-zinc-400 leading-relaxed mb-4">
          Silent suppression is the most common outcome, but banned terms can also trigger:
        </p>
        <ul className="space-y-2 mb-4">
          {[
            ["Full listing suppression", "Listing removed from search entirely until the term is removed"],
            ["Category review", "Amazon flags the listing for manual review, which can take 1\u20137 days"],
            ["Account-level warning", "Repeated violations accumulate and may lead to account suspension"],
            ["ASIN deactivation", "For severe violations (medical claims, counterfeit-related terms), the ASIN is delisted"],
          ].map(([title, desc]) => (
            <li key={title} className="flex items-start gap-3 text-zinc-400">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
              <span>
                <strong className="text-zinc-200">{title}:</strong> {desc}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-zinc-400 leading-relaxed">
          The tricky part: many of these words seem harmless. &quot;Guarantee,&quot; &quot;free shipping,&quot;
          and &quot;#1&quot; are all commonly used in everyday marketing copy. But on Amazon,
          they&apos;re policy violations.
        </p>
      </section>

      {/* ── Section 2: Amazon ── */}
      <section id="amazon" className="mb-14">
        <h2 className="text-2xl font-semibold text-zinc-100 mb-2">
          Amazon Banned Words &amp; Restricted Phrases
        </h2>
        <p className="text-zinc-400 mb-6">
          These terms apply to titles, bullet points, descriptions, and A+ Content.
          <strong className="text-zinc-200"> &quot;Suppression&quot;</strong> means the term
          will likely cause your listing to be removed from search.
          <strong className="text-zinc-200"> &quot;Warning&quot;</strong> means the term is
          discouraged and may be flagged during review.
        </p>
        <TermTable terms={AMAZON_TERMS} marketplace="amazon" />

        <div className="card-subtle p-5 mb-4">
          <p className="text-sm text-zinc-400">
            <strong className="text-zinc-200">Backend keywords too:</strong> These rules also apply to
            your backend search terms field. Amazon&apos;s 250-byte limit for backend keywords is strictly enforced,
            and banned terms in the backend field can suppress the entire listing.
          </p>
        </div>

        <h3 className="text-lg font-semibold text-zinc-200 mt-8 mb-3">
          Special categories with additional restrictions
        </h3>
        <p className="text-zinc-400 leading-relaxed mb-4">
          Some Amazon categories have even stricter rules:
        </p>
        <ul className="space-y-2 mb-4">
          {[
            ["Health & Personal Care", "No disease names, treatment claims, or \"anti-\" prefixes without FDA approval"],
            ["Supplements", "Cannot claim to \"boost,\" \"enhance,\" or \"improve\" specific bodily functions"],
            ["Baby & Children", "Cannot reference safety certifications you haven't obtained (CPSC, ASTM)"],
            ["Electronics", "Cannot claim compatibility with brands you aren't authorized to reference"],
          ].map(([category, rule]) => (
            <li key={category} className="flex items-start gap-3 text-zinc-400">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sa-200 shrink-0" />
              <span>
                <strong className="text-zinc-200">{category}:</strong> {rule}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <CTABox />

      {/* ── Section 3: eBay ── */}
      <section id="ebay" className="mb-14">
        <h2 className="text-2xl font-semibold text-zinc-100 mb-2">
          eBay Restricted Terms
        </h2>
        <p className="text-zinc-400 mb-6">
          eBay enforces terms through the <strong className="text-zinc-200">VeRO (Verified Rights Owner) program</strong>.
          Counterfeit-related words are the most dangerous &mdash; they can trigger immediate listing removal
          and account suspension.
        </p>
        <TermTable terms={EBAY_TERMS} marketplace="ebay" />

        <div className="card-subtle p-5">
          <p className="text-sm text-zinc-400">
            <strong className="text-zinc-200">eBay item specifics matter:</strong> Banned terms in
            item specifics (structured attributes) are flagged just like those in the description.
            Since Cassini (eBay&apos;s search algorithm) weights item specifics heavily for ranking,
            getting these right is critical.
          </p>
        </div>
      </section>

      {/* ── Section 4: Walmart ── */}
      <section id="walmart" className="mb-14">
        <h2 className="text-2xl font-semibold text-zinc-100 mb-2">
          Walmart Marketplace Restricted Terms
        </h2>
        <p className="text-zinc-400 mb-6">
          Walmart has one unique rule that catches many sellers off guard: you
          <strong className="text-zinc-200"> cannot mention Amazon, Prime, or any competing marketplace</strong> in
          your listing content. Sellers who cross-list from Amazon often forget to remove these references.
        </p>
        <TermTable terms={WALMART_TERMS} marketplace="walmart" />
      </section>

      {/* ── Section 5: Shopify ── */}
      <section id="shopify" className="mb-14">
        <h2 className="text-2xl font-semibold text-zinc-100 mb-2">
          Shopify &amp; DTC Store Restricted Terms
        </h2>
        <p className="text-zinc-400 mb-6">
          Shopify stores aren&apos;t subject to marketplace enforcement, but the
          <strong className="text-zinc-200"> FTC</strong> and
          <strong className="text-zinc-200"> advertising standards boards</strong> still apply.
          These terms create legal liability and erode customer trust on your own storefront.
        </p>
        <TermTable terms={SHOPIFY_TERMS} marketplace="shopify" />
      </section>

      {/* ── Section 6: Cross-Marketplace ── */}
      <section id="cross-marketplace" className="mb-14">
        <h2 className="text-2xl font-semibold text-zinc-100 mb-4">
          Cross-Marketplace Comparison
        </h2>
        <p className="text-zinc-400 mb-6">
          If you sell on multiple platforms, these terms are banned or restricted <strong className="text-zinc-200">everywhere</strong>:
        </p>

        <div className="overflow-x-auto mb-8">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-zinc-400 font-medium">Term</th>
                <th className="text-center py-3 px-3 text-zinc-400 font-medium">Amazon</th>
                <th className="text-center py-3 px-3 text-zinc-400 font-medium">eBay</th>
                <th className="text-center py-3 px-3 text-zinc-400 font-medium">Walmart</th>
                <th className="text-center py-3 px-3 text-zinc-400 font-medium">Shopify</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["#1 / number one", true, true, true, false],
                ["guarantee(d)", true, true, true, true],
                ["100%", true, true, true, true],
                ["free shipping", true, false, true, false],
                ["act now / limited time", true, false, true, false],
                ["FDA approved", true, false, true, true],
                ["clinically proven", true, false, true, true],
                ["cure / treats", true, false, false, true],
                ["cheap", false, false, true, false],
                ["emojis", true, false, true, false],
                ["fake / replica / counterfeit", false, true, false, false],
                ["Amazon / Prime", false, false, true, false],
              ].map(([term, amz, ebay, wmt, shp]) => (
                <tr key={term as string} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="py-2.5 px-4 font-mono text-zinc-300 text-sm">{term as string}</td>
                  <td className="py-2.5 px-3 text-center">{amz ? <span className="text-red-400">Banned</span> : <span className="text-zinc-600">&mdash;</span>}</td>
                  <td className="py-2.5 px-3 text-center">{ebay ? <span className="text-red-400">Banned</span> : <span className="text-zinc-600">&mdash;</span>}</td>
                  <td className="py-2.5 px-3 text-center">{wmt ? <span className="text-red-400">Banned</span> : <span className="text-zinc-600">&mdash;</span>}</td>
                  <td className="py-2.5 px-3 text-center">{shp ? <span className="text-red-400">Banned</span> : <span className="text-zinc-600">&mdash;</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-zinc-400 leading-relaxed">
          The universal takeaway: <strong className="text-zinc-200">unsubstantiated claims</strong> (#1, guarantee, 100%)
          and <strong className="text-zinc-200">medical claims</strong> (FDA approved, clinically proven, cure) are
          restricted on virtually every platform. If you sell on multiple marketplaces, these
          should never appear in your base listing copy.
        </p>
      </section>

      {/* ── Section 7: How to Check ── */}
      <section id="how-to-check" className="mb-14">
        <h2 className="text-2xl font-semibold text-zinc-100 mb-4">
          How to check your listings automatically
        </h2>
        <p className="text-zinc-400 leading-relaxed mb-4">
          Manually scanning every listing for banned terms isn&apos;t practical, especially if you have
          dozens or hundreds of SKUs. Here are three approaches:
        </p>

        <div className="space-y-6">
          <div className="card-glass p-5">
            <h3 className="text-base font-semibold text-zinc-200 mb-2">Option 1: Manual search (free, slow)</h3>
            <p className="text-sm text-zinc-400">
              Open your listing in Seller Central, use Ctrl+F to search for each banned term one at a time.
              Effective for 1&ndash;5 listings. Impractical beyond that.
            </p>
          </div>

          <div className="card-glass p-5">
            <h3 className="text-base font-semibold text-zinc-200 mb-2">Option 2: Spreadsheet formula (free, medium)</h3>
            <p className="text-sm text-zinc-400">
              Export your listings to CSV, use a SEARCH or REGEX formula to flag rows containing banned terms.
              Works for bulk scanning but requires maintenance as policies change.
            </p>
          </div>

          <div className="card-glass p-5 border-sa-200/20">
            <h3 className="text-base font-semibold text-sa-200 mb-2">Option 3: Automated scanning (recommended)</h3>
            <p className="text-sm text-zinc-400 mb-3">
              Use a tool that maintains an up-to-date banned terms database and scans your listings
              automatically. SellerAide&apos;s free Chrome extension does this in one click &mdash;
              navigate to any Amazon or eBay listing, click the extension, and get an instant
              compliance report with a 0&ndash;100 quality score.
            </p>
            <div className="flex flex-wrap gap-3">
              {EXTENSION_URL ? (
                <a href={EXTENSION_URL} target="_blank" rel="noopener noreferrer" className="btn-primary text-sm">
                  Install Free Extension
                </a>
              ) : (
                <Link href="/audit" className="btn-primary text-sm">
                  Try the Free Audit Tool
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 8: Safe Alternatives ── */}
      <section id="safe-alternatives" className="mb-14">
        <h2 className="text-2xl font-semibold text-zinc-100 mb-4">
          Safe alternatives for common banned phrases
        </h2>
        <p className="text-zinc-400 mb-6">
          You don&apos;t have to sacrifice persuasive copy. Here are compliant alternatives
          that convey the same message:
        </p>

        <div className="overflow-x-auto mb-8">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-zinc-400 font-medium">Don&apos;t Use</th>
                <th className="text-left py-3 px-4 text-zinc-400 font-medium">Use Instead</th>
                <th className="text-left py-3 px-4 text-zinc-400 font-medium">Why It Works</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["#1 best seller", "Top-rated by customers", "Implies popularity without making an unverifiable claim"],
                ["100% guaranteed", "Backed by our warranty", "Specific and substantiated without absolute language"],
                ["Free shipping", "(Don't mention it)", "Configure free shipping in Seller Central settings instead"],
                ["Act now / Hurry", "Available while supplies last", "Factual inventory statement, not pressure tactic"],
                ["Clinically proven", "Formulated with [ingredient]", "Focuses on what's in the product, not unverified claims"],
                ["Cure / Treats", "Supports [function]", "Softer language that avoids medical claims"],
                ["Cheap", "Affordable / Great value", "Conveys price advantage without undermining quality"],
                ["Buy now", "Add to Cart", "Amazon's own call-to-action — don't compete with it"],
                ["FDA approved", "Made in an FDA-registered facility", "If accurate, describes facility compliance without claiming product approval"],
              ].map(([bad, good, why]) => (
                <tr key={bad} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="py-3 px-4 font-mono text-red-400 text-sm line-through decoration-red-400/40">{bad}</td>
                  <td className="py-3 px-4 font-mono text-emerald-400 text-sm">{good}</td>
                  <td className="py-3 px-4 text-zinc-400">{why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="mb-14">
        <div
          className="card-glass p-8 sm:p-10 text-center"
          style={{
            background:
              "radial-gradient(circle at 50% 0%, rgba(246,203,99,0.08), transparent 50%)",
          }}
        >
          <h2 className="text-2xl font-semibold text-zinc-100 mb-3">
            Stop guessing. Scan your listings now.
          </h2>
          <p className="text-zinc-400 mb-6 max-w-xl mx-auto">
            SellerAide checks every banned term, scores your listing 0&ndash;100, and
            generates compliant, optimized copy powered by AI. Free audit &mdash; no account required.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {EXTENSION_URL ? (
              <a href={EXTENSION_URL} target="_blank" rel="noopener noreferrer" className="btn-primary">
                Install Free Extension
              </a>
            ) : (
              <Link href="/audit" className="btn-primary">
                Try the Free Audit Tool
              </Link>
            )}
            <Link href="/signup" className="btn-secondary">
              Start 7-Day Free Trial
            </Link>
          </div>
        </div>
      </section>

      {/* ── Schema.org Article structured data ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: "Amazon Banned Words List 2026: The Complete Guide for Sellers",
            description:
              "The complete list of banned words and restricted phrases that cause Amazon listing suppression in 2026.",
            datePublished: "2026-02-26",
            dateModified: "2026-02-26",
            author: {
              "@type": "Organization",
              name: "SellerAide",
              url: "https://selleraide.com",
            },
            publisher: {
              "@type": "Organization",
              name: "SellerAide",
              url: "https://selleraide.com",
            },
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": "https://selleraide.com/blog/amazon-banned-words",
            },
          }),
        }}
      />
    </article>
  );
}
