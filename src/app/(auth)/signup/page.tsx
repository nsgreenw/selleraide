"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { buildAuthHref, sanitizeNextPath } from "@/lib/utils/next-path";

function SignupPageContent() {
  const searchParams = useSearchParams();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const nextPath = sanitizeNextPath(searchParams.get("next"));
  const loginHref = buildAuthHref("/login", nextPath);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          ...(fullName ? { full_name: fullName } : {}),
          ...(nextPath ? { next: nextPath } : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Signup failed");
        return;
      }

      setSuccess("Account created. Check your email to confirm your account, then sign in.");
      setEmail("");
      setPassword("");
      setFullName("");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <p className="label-kicker text-sa-200 text-center mb-8">SELLERAIDE</p>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-100 text-center mb-6">
        Create your account
      </h1>
      <p className="mb-6 text-center text-sm text-zinc-400">
        Create your account first. You&apos;ll add a card when you start your 7-day free trial.
      </p>

      {error && (
        <div className="rounded-xl border border-rose-300/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-200 mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-emerald-300/25 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200 mb-4">
          {success} You can sign in and return to your audit after confirming your email.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="full_name" className="label-kicker text-zinc-400 mb-2 block">
            Full name (optional)
          </label>
          <input
            id="full_name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jane Smith"
            className="rounded-xl border border-white/15 bg-black/35 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-[var(--sa-200)]/70 outline-none w-full"
          />
        </div>

        <div>
          <label htmlFor="email" className="label-kicker text-zinc-400 mb-2 block">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="rounded-xl border border-white/15 bg-black/35 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-[var(--sa-200)]/70 outline-none w-full"
          />
        </div>

        <div>
          <label htmlFor="password" className="label-kicker text-zinc-400 mb-2 block">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
            className="rounded-xl border border-white/15 bg-black/35 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-[var(--sa-200)]/70 outline-none w-full"
          />
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-zinc-400">
          Already have an account?{" "}
          <Link href={loginHref} className="text-sm text-sa-200 hover:text-sa-100">
            Sign in
          </Link>
        </p>
      </div>
    </>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupPageContent />
    </Suspense>
  );
}
