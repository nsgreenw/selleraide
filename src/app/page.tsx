"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  Puzzle,
  ArrowUpRight,
  Menu,
  X,
} from "lucide-react";

const EXTENSION_URL = "https://chromewebstore.google.com/detail/selleraide-listing-audit/gfcoilmeghppmemfankehajkdpghdeio";

const LANDING_NAV_LINKS = [
  { href: "/audit", label: "Audit a Listing" },
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
] as const;

export default function Home() {
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="min-h-screen">
      {/* ── Navigation Bar ── */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-black/40 backdrop-blur-lg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex min-h-[76px] items-center justify-between gap-4">
            <Link href="/" aria-label="SellerAide home" className="shrink-0">
              <Logo variant="full" size="sm" />
            </Link>

            <div className="hidden items-center gap-6 md:flex">
              {LANDING_NAV_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm text-zinc-400 hover:text-zinc-200"
                >
                  {item.label}
                </Link>
              ))}
              <a
                href={EXTENSION_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200"
              >
                <Puzzle className="size-3.5" />
                Extension
              </a>
              <Link href="/login" className="btn-secondary text-sm">
                Log In
              </Link>
              <Link href="/signup" className="btn-primary text-sm">
                Get Started
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.04] text-zinc-100 shadow-[0_10px_30px_rgba(0,0,0,0.25)] transition hover:border-white/20 hover:bg-white/[0.08] md:hidden"
              aria-expanded={mobileMenuOpen}
              aria-controls="landing-mobile-menu"
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        <div
          className={`md:hidden ${mobileMenuOpen ? "pointer-events-auto" : "pointer-events-none"}`}
          aria-hidden={!mobileMenuOpen}
        >
          <div
            className={`absolute inset-x-0 top-full h-[calc(100vh-76px)] bg-black/55 backdrop-blur-sm transition-opacity duration-300 ${
              mobileMenuOpen ? "opacity-100" : "opacity-0"
            }`}
            onClick={() => setMobileMenuOpen(false)}
          />

          <div
            id="landing-mobile-menu"
            className={`absolute inset-x-4 top-[calc(100%-0.5rem)] origin-top rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(18,18,20,0.98)_0%,rgba(10,11,13,0.98)_100%)] p-4 shadow-[0_28px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl transition-all duration-300 ease-out ${
              mobileMenuOpen
                ? "translate-y-0 scale-100 opacity-100"
                : "-translate-y-3 scale-[0.98] opacity-0"
            }`}
          >
            <div className="mb-3 flex items-center justify-between border-b border-white/8 pb-3">
              <div>
                <p className="label-kicker text-sa-200">Navigation</p>
                <p className="mt-1 text-sm text-zinc-500">Everything important. None of the crowding.</p>
              </div>
              <Link
                href="/signup"
                className="btn-primary px-3 py-2 text-sm"
                onClick={() => setMobileMenuOpen(false)}
              >
                Get Started
              </Link>
            </div>

            <div className="space-y-2">
              {LANDING_NAV_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm font-medium text-zinc-200 transition hover:border-white/15 hover:bg-white/[0.06]"
                >
                  <span>{item.label}</span>
                  <ArrowUpRight className="size-4 text-zinc-500" />
                </Link>
              ))}

              <a
                href={EXTENSION_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm font-medium text-zinc-200 transition hover:border-white/15 hover:bg-white/[0.06]"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="flex items-center gap-2">
                  <Puzzle className="size-4 text-sa-200" />
                  Chrome Extension
                </span>
                <ArrowUpRight className="size-4 text-zinc-500" />
              </a>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link
                href="/login"
                className="btn-secondary text-sm"
                onClick={() => setMobileMenuOpen(false)}
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="btn-primary text-sm"
                onClick={() => setMobileMenuOpen(false)}
              >
                Start Trial
              </Link>
            </div>
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
          AMAZON-COMPLIANT LISTING OPTIMIZATION
        </p>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-zinc-100 mb-6 relative">
          Create listings that convert.
          <br />
          Stay compliant.
        </h1>

        <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 relative">
          SellerAide helps brand owners draft high-converting content, audit for Amazon policy violations,
          and optimize keyword strategy in minutes.
        </p>
        <p className="text-sm text-zinc-500 max-w-2xl mx-auto mb-10 relative">
          Card required to start trial. Cancel before day 7 to avoid billing.
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
          <p className="label-kicker text-zinc-500 mb-6">OPTIMIZED FOR BRAND OWNERS ON</p>

          <div className="flex flex-wrap justify-center gap-4">
            <div className="card-subtle px-6 py-3 flex items-center gap-3">
              <ShoppingCart className="size-5 text-zinc-400" />
              <span className="text-zinc-300 text-sm font-medium">Amazon Seller Central</span>
            </div>
            <div className="card-subtle px-6 py-3 flex items-center gap-3">
              <Tag className="size-5 text-zinc-400" />
              <span className="text-zinc-300 text-sm font-medium">eBay Stores</span>
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
              Data-driven brand growth
            </h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">
              Ensure your catalog meets strict marketplace standards while maximizing visibility.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Chrome Extension */}
            <div className="card-glass p-6 relative overflow-hidden">
              <span className="absolute top-3 right-3 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5">
                Free
              </span>
              <div className="w-10 h-10 rounded-xl bg-sa-200/10 flex items-center justify-center mb-4">
                <Puzzle className="size-5 text-sa-200" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">
                Chrome Extension
              </h3>
              <p className="text-sm text-zinc-400 mb-3">
                Audit any Amazon or eBay listing in one click directly from the product page — no copy-paste needed.
              </p>
              <a
                href={EXTENSION_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-sa-200 hover:text-sa-100 transition-colors"
              >
                Add to Chrome — Free
                <ArrowUpRight className="size-3.5" />
              </a>
            </div>

            {/* Feature 1 */}
            <div className="card-glass p-6">
              <div className="w-10 h-10 rounded-xl bg-sa-200/10 flex items-center justify-center mb-4">
                <MessageSquare className="size-5 text-sa-200" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">
                Listing Assistant
              </h3>
              <p className="text-sm text-zinc-400">
                Draft professional product descriptions and bullet points that highlight key features
                while adhering to style guides.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="card-glass p-6">
              <div className="w-10 h-10 rounded-xl bg-sa-200/10 flex items-center justify-center mb-4">
                <Search className="size-5 text-sa-200" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">
                Keyword Intelligence
              </h3>
              <p className="text-sm text-zinc-400">
                Identify high-opportunity search terms relevant to your brand and category
                without keyword stuffing.
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
                Tailor your content for specific algorithms (Amazon A9, eBay Cassini) to improve organic ranking.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="card-glass p-6">
              <div className="w-10 h-10 rounded-xl bg-sa-200/10 flex items-center justify-center mb-4">
                <Shield className="size-5 text-sa-200" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">
                Policy Compliance
              </h3>
              <p className="text-sm text-zinc-400">
                Automatically audit drafts for banned terms, claim violations, and character limits
                before you publish.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="card-glass p-6">
              <div className="w-10 h-10 rounded-xl bg-sa-200/10 flex items-center justify-center mb-4">
                <BarChart3 className="size-5 text-sa-200" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">
                Listing Health Score
              </h3>
              <p className="text-sm text-zinc-400">
                Get a 0-100 quality score for every SKU based on image count, title structure, and completeness.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="card-glass p-6">
              <div className="w-10 h-10 rounded-xl bg-sa-200/10 flex items-center justify-center mb-4">
                <Download className="size-5 text-sa-200" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">
                Multi-Channel Sync
              </h3>
              <p className="text-sm text-zinc-400">
                Maintain brand consistency across channels. Export optimized data for Seller Central or eBay.
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
            <p className="text-zinc-400 mb-5">
              Starter and Pro include a 7-day free trial with card on file. Monthly and yearly billing available.
            </p>
            <div className="inline-flex rounded-lg border border-white/10 bg-black/30 p-1 text-sm">
              <button
                onClick={() => setBillingInterval("monthly")}
                className={`rounded-md px-4 py-2 transition ${
                  billingInterval === "monthly"
                    ? "bg-sa-200 text-zinc-950"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingInterval("yearly")}
                className={`rounded-md px-4 py-2 transition ${
                  billingInterval === "yearly"
                    ? "bg-sa-200 text-zinc-950"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Yearly
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* STARTER */}
            <div className="card-glass p-6">
              <p className="label-kicker text-zinc-500 mb-3">STARTER</p>
              <div className="mb-1">
                <span className="text-3xl font-semibold text-zinc-100">
                  {billingInterval === "monthly" ? "$19" : "$199"}
                </span>
                <span className="text-sm text-zinc-500">
                  {billingInterval === "monthly" ? " /month" : " /year"}
                </span>
                {billingInterval === "yearly" && (
                  <p className="text-xs text-emerald-300">Save $29/yr (13%)</p>
                )}
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
                    A+ Content (4-module stack)
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
                Start 7-Day Free Trial
              </Link>
            </div>

            {/* PRO (highlighted) */}
            <div className="card-glass p-6 relative border-sa-200/50">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-sa-200 text-zinc-950 text-xs font-semibold px-3 py-1">
                POPULAR
              </span>
              <p className="label-kicker text-sa-200 mb-3">PRO</p>
              <div className="mb-1">
                <span className="text-3xl font-semibold text-sa-100">
                  {billingInterval === "monthly" ? "$49" : "$499"}
                </span>
                <span className="text-sm text-zinc-500">
                  {billingInterval === "monthly" ? " /month" : " /year"}
                </span>
                {billingInterval === "yearly" && (
                  <p className="text-xs text-emerald-300">Save $89/yr (15%)</p>
                )}
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
                  <span className="text-sm text-zinc-400 font-medium text-zinc-300">
                    A+ Content (full 7-module stack)
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
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-sa-200 shrink-0" />
                  <span className="text-sm font-medium text-zinc-300">
                    Bulk CSV generation (up to 50)
                  </span>
                </li>
              </ul>
              <Link href="/signup" className="btn-primary w-full mt-6">
                Start 7-Day Free Trial
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
                    A+ Content (7-module stack)
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
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-zinc-500 shrink-0" />
                  <span className="text-sm text-zinc-400">
                    Bulk CSV generation (up to 200)
                  </span>
                </li>
              </ul>
              <a href="mailto:support@selleraide.com" className="btn-secondary w-full mt-6">
                Contact Sales
              </a>
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
              Join sellers who use SellerAide to optimize their Amazon and eBay listings with a 7-day free trial and card-required checkout.
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
            <a
              href={EXTENSION_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
            >
              <Puzzle className="size-3" />
              Chrome Extension
            </a>
            <Link href="/privacy" className="text-xs text-zinc-500 hover:text-zinc-300">
              Privacy
            </Link>
            <Link href="/terms" className="text-xs text-zinc-500 hover:text-zinc-300">
              Terms
            </Link>
            <Link href="/cookies" className="text-xs text-zinc-500 hover:text-zinc-300">
              Cookies
            </Link>
            <Link href="/refunds" className="text-xs text-zinc-500 hover:text-zinc-300">
              Refunds
            </Link>
            <Link href="/acceptable-use" className="text-xs text-zinc-500 hover:text-zinc-300">
              Acceptable Use
            </Link>
            <Link href="/contact" className="text-xs text-zinc-500 hover:text-zinc-300">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
