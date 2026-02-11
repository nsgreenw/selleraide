"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      router.push("/chat");
      router.refresh();
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
        Sign in to your account
      </h1>

      {error && (
        <div className="rounded-xl border border-rose-300/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-200 mb-4">
          {error}
        </div>
      )}

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
            className="rounded-xl border border-white/15 bg-black/35 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-[var(--sa-200)]/70 outline-none w-full"
          />
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <div className="mt-6 flex flex-col items-center gap-2">
        <Link href="/forgot-password" className="text-sm text-sa-200 hover:text-sa-100">
          Forgot your password?
        </Link>
        <p className="text-sm text-zinc-400">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-sm text-sa-200 hover:text-sa-100">
            Sign up
          </Link>
        </p>
      </div>
    </>
  );
}
