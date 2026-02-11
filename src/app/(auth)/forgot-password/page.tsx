"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      setSuccess(true);
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
        Reset your password
      </h1>

      {error && (
        <div className="rounded-xl border border-rose-300/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-200 mb-4">
          {error}
        </div>
      )}

      {success ? (
        <div className="text-center">
          <p className="text-sm text-zinc-300 mb-6">
            If an account with that email exists, we&apos;ve sent a password reset link.
            Check your inbox.
          </p>
          <Link href="/login" className="text-sm text-sa-200 hover:text-sa-100">
            Back to sign in
          </Link>
        </div>
      ) : (
        <>
          <p className="text-sm text-zinc-400 text-center mb-6">
            Enter your email and we&apos;ll send you a reset link.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
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

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm text-sa-200 hover:text-sa-100">
              Back to sign in
            </Link>
          </div>
        </>
      )}
    </>
  );
}
