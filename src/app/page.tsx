import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import {
  Sparkles,
  ShoppingCart,
  Tag,
  MessageSquare,
  Search,
  Target,
  Shield,
  BarChart3,
  Download,
  Check,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* ── Navigation Bar ── */}
      <nav className="sticky top-0 z-50 backdrop-blur-lg border-b border-white/10 bg-black/40">
        <div className="max-w-7xl mx-auto flex items-center justify-between py-4 px-6">
          <Logo variant="full" size="sm" />

          <div className="flex items-center gap-6">
            <Link
              href="/audit"
              className="text-sm text-zinc-400 hover:text-zinc-200"
            >
              Audit a Listing
            </Link>
            <Link
              href="#features"
              className="text-sm text-zinc-400 hover:text-zinc-200"
            >
              Features
            </Link>
            <Link
              href="#pricing"
              className="text-sm text-zinc-400 hover:text-zinc-200"
            >
              Pricing
            </Link>
            <Link href="/login" className="btn-secondary text-sm">
              Log In
            </Link>
            <Link href="/signup" className="btn-primary text-sm">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="relative pt-24 pb-20 sm:pt-32 sm:pb-28 text-center max-w-4xl mx-auto px-6">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 50% 0%, rgba(246,203,99,0.12), transparent 50%)",
          }}
        />

        <p className="label-kicker text-sa-200 mb-6 relative">
          AI-POWERED LISTING OPTIMIZATION
        </p>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-zinc-100 mb-6 relative">
          Create listings that sell.
          <br />
          Not just exist.
        </h1>

        <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 relative">
          SellerAide researches your product, optimizes for marketplace
          algorithms, and generates high-converting listings for Amazon and eBay.
        </p>

        <div className="flex gap-4 justify-center relative">
          <Link
            href="/signup"
            className="btn-primary px-8 py-3 text-base gap-2"
          >
            <Sparkles className="size-5" />
            Start 7-Day Free Trial
          </Link>
          <Link
            href="#features"
            className="btn-secondary px-8 py-3 text-base"
          >
            See How It Works
          </Link>
        </div>
      </section>

      {/* ── Social Proof / Marketplace Strip ── */}
      <section className="py-12 border-y border-white/10">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className="label-kicker text-zinc-500 mb-6">OPTIMIZED FOR</p>

          <div className="flex flex-wrap justify-center gap-4">
            <div className="card-subtle px-6 py-3 flex items-center gap-3">
              <ShoppingCart className="size-5 text-zinc-400" />
              <span className="text-zinc-300 text-sm font-medium">Amazon</span>
            </div>
            <div className="card-subtle px-6 py-3 flex items-center gap-3">
              <Tag className="size-5 text-zinc-400" />
              <span className="text-zinc-300 text-sm font-medium">eBay</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section id="features" className="py-20 sm:py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="label-kicker text-sa-200 mb-4">FEATURES</p>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-zinc-100 mb-4">
              Everything you need to dominate
            </h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">
              From AI-powered generation to automated quality checks, SellerAide
              gives you every tool to create marketplace-winning listings.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Feature 1 */}
            <div className="card-glass p-6">
              <div className="w-10 h-10 rounded-xl bg-sa-200/10 flex items-center justify-center mb-4">
                <MessageSquare className="size-5 text-sa-200" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">
                AI Chat Assistant
              </h3>
              <p className="text-sm text-zinc-400">
                Have a conversation about your product. Our AI asks the right
                questions, researches your market, and generates optimized
                listings.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="card-glass p-6">
              <div className="w-10 h-10 rounded-xl bg-sa-200/10 flex items-center justify-center mb-4">
                <Search className="size-5 text-sa-200" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">
                Smart Research
              </h3>
              <p className="text-sm text-zinc-400">
                Automatic keyword research, competitor analysis, and trend
                identification for your product category.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="card-glass p-6">
              <div className="w-10 h-10 rounded-xl bg-sa-200/10 flex items-center justify-center mb-4">
                <Target className="size-5 text-sa-200" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">
                Marketplace Optimization
              </h3>
              <p className="text-sm text-zinc-400">
                Listings tailored to each marketplace&apos;s algorithm — Amazon A9 and eBay Cassini.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="card-glass p-6">
              <div className="w-10 h-10 rounded-xl bg-sa-200/10 flex items-center justify-center mb-4">
                <Shield className="size-5 text-sa-200" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">
                QA & Compliance
              </h3>
              <p className="text-sm text-zinc-400">
                Automated quality checks catch banned terms, character limits,
                and policy violations before you publish.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="card-glass p-6">
              <div className="w-10 h-10 rounded-xl bg-sa-200/10 flex items-center justify-center mb-4">
                <BarChart3 className="size-5 text-sa-200" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">
                Scoring & Grading
              </h3>
              <p className="text-sm text-zinc-400">
                Every listing scored 0-100 with detailed breakdowns. Know
                exactly where to improve.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="card-glass p-6">
              <div className="w-10 h-10 rounded-xl bg-sa-200/10 flex items-center justify-center mb-4">
                <Download className="size-5 text-sa-200" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">
                Export Anywhere
              </h3>
              <p className="text-sm text-zinc-400">
                Copy to clipboard, download as PDF or CSV. Ready to paste into
                Seller Central, Marketplace, or your store.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-20 sm:py-28 px-6 border-t border-white/10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="label-kicker text-sa-200 mb-4">HOW IT WORKS</p>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-zinc-100">
              From product to listing in minutes
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="card-subtle p-6 text-center">
              <div className="w-8 h-8 rounded-full bg-sa-200/10 border border-sa-200/30 flex items-center justify-center text-sa-200 text-sm font-semibold mx-auto mb-4">
                1
              </div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">
                Tell us about your product
              </h3>
              <p className="text-sm text-zinc-400">
                Pick your marketplace and describe what you&apos;re selling. Our
                AI asks follow-up questions to understand your product.
              </p>
            </div>

            {/* Step 2 */}
            <div className="card-subtle p-6 text-center">
              <div className="w-8 h-8 rounded-full bg-sa-200/10 border border-sa-200/30 flex items-center justify-center text-sa-200 text-sm font-semibold mx-auto mb-4">
                2
              </div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">
                We research & generate
              </h3>
              <p className="text-sm text-zinc-400">
                SellerAide researches your category, finds top keywords, and
                generates a marketplace-optimized listing.
              </p>
            </div>

            {/* Step 3 */}
            <div className="card-subtle p-6 text-center">
              <div className="w-8 h-8 rounded-full bg-sa-200/10 border border-sa-200/30 flex items-center justify-center text-sa-200 text-sm font-semibold mx-auto mb-4">
                3
              </div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">
                Refine & export
              </h3>
              <p className="text-sm text-zinc-400">
                Review your listing score, make adjustments through chat, and
                export when ready.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing Section ── */}
      <section id="pricing" className="py-20 sm:py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="label-kicker text-sa-200 mb-4">PRICING</p>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-zinc-100 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-zinc-400">
              All paid plans include a 7-day free trial.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* STARTER */}
            <div className="card-glass p-6">
              <p className="label-kicker text-zinc-500 mb-3">STARTER</p>
              <div className="mb-1">
                <span className="text-3xl font-semibold text-zinc-100">
                  $19
                </span>
                <span className="text-sm text-zinc-500"> /month</span>
              </div>
              <div className="border-t border-white/10 my-4" />
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-zinc-500 shrink-0" />
                  <span className="text-sm text-zinc-400">
                    50 listings per month
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-zinc-500 shrink-0" />
                  <span className="text-sm text-zinc-400">
                    Amazon + eBay
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-zinc-500 shrink-0" />
                  <span className="text-sm text-zinc-400">
                    Full QA & scoring
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-zinc-500 shrink-0" />
                  <span className="text-sm text-zinc-400">
                    PDF & CSV export
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-zinc-500 shrink-0" />
                  <span className="text-sm text-zinc-400">
                    Priority generation
                  </span>
                </li>
              </ul>
              <Link href="/signup" className="btn-primary w-full mt-6">
                Start Free Trial
              </Link>
            </div>

            {/* PRO (highlighted) */}
            <div className="card-glass p-6 relative border-sa-200/50">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-sa-200 text-zinc-950 text-xs font-semibold px-3 py-1">
                POPULAR
              </span>
              <p className="label-kicker text-sa-200 mb-3">PRO</p>
              <div className="mb-1">
                <span className="text-3xl font-semibold text-sa-100">$49</span>
                <span className="text-sm text-zinc-500"> /month</span>
              </div>
              <div className="border-t border-white/10 my-4" />
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-sa-200 shrink-0" />
                  <span className="text-sm text-zinc-400">
                    200 listings per month
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-sa-200 shrink-0" />
                  <span className="text-sm text-zinc-400">
                    Amazon + eBay
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-sa-200 shrink-0" />
                  <span className="text-sm text-zinc-400">
                    Full QA & scoring
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-sa-200 shrink-0" />
                  <span className="text-sm text-zinc-400">
                    PDF & CSV export
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-sa-200 shrink-0" />
                  <span className="text-sm text-zinc-400">
                    Priority generation
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-sa-200 shrink-0" />
                  <span className="text-sm text-zinc-400">
                    Listing history
                  </span>
                </li>
              </ul>
              <Link href="/signup" className="btn-primary w-full mt-6">
                Start Free Trial
              </Link>
            </div>

            {/* AGENCY */}
            <div className="card-glass p-6">
              <p className="label-kicker text-zinc-500 mb-3">AGENCY</p>
              <div className="mb-1">
                <span className="text-3xl font-semibold text-zinc-100">
                  Custom
                </span>
                <span className="text-sm text-zinc-500"> pricing</span>
              </div>
              <div className="border-t border-white/10 my-4" />
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-zinc-500 shrink-0" />
                  <span className="text-sm text-zinc-400">
                    Unlimited listings
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-zinc-500 shrink-0" />
                  <span className="text-sm text-zinc-400">
                    Amazon + eBay
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-zinc-500 shrink-0" />
                  <span className="text-sm text-zinc-400">
                    Full QA & scoring
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-zinc-500 shrink-0" />
                  <span className="text-sm text-zinc-400">
                    PDF & CSV export
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-zinc-500 shrink-0" />
                  <span className="text-sm text-zinc-400">
                    Priority generation
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-zinc-500 shrink-0" />
                  <span className="text-sm text-zinc-400">
                    Priority support
                  </span>
                </li>
              </ul>
              <Link href="/signup" className="btn-secondary w-full mt-6">
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div
            className="card-glass p-10 sm:p-14"
            style={{
              background:
                "radial-gradient(circle at 50% 0%, rgba(246,203,99,0.08), transparent 50%)",
            }}
          >
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-zinc-100 mb-4">
              Ready to create listings that convert?
            </h2>
            <p className="text-zinc-400 mb-8">
              Join sellers who use SellerAide to optimize their Amazon and eBay listings with a 7-day free trial.
            </p>
            <Link href="/signup" className="btn-primary px-8 py-3 text-base">
              Start 7-Day Free Trial
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/10 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo variant="icon" size="sm" className="opacity-40" />
          <p className="text-xs text-zinc-600">
            &copy; 2026 SellerAide. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link href="/privacy" className="text-xs text-zinc-500 hover:text-zinc-300">
              Privacy
            </Link>
            <Link href="/terms" className="text-xs text-zinc-500 hover:text-zinc-300">
              Terms
            </Link>
            <Link href="/cookies" className="text-xs text-zinc-500 hover:text-zinc-300">
              Cookies
            </Link>
            <Link href="/acceptable-use" className="text-xs text-zinc-500 hover:text-zinc-300">
              Acceptable Use
            </Link>
            <a href="mailto:support@selleraide.com" className="text-xs text-zinc-500 hover:text-zinc-300">
              Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
