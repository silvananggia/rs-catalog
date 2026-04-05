"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

/** Only allow same-origin paths (avoid open redirects like //evil.com). */
function safeRedirectPath(from: string | null): string {
  const fallback = "/dashboard";
  if (!from || !from.startsWith("/") || from.startsWith("//")) return fallback;
  return from;
}

export function LoginForm() {
  const searchParams = useSearchParams();
  const from = safeRedirectPath(searchParams.get("from"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ email, password }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("Invalid email or password.");
      return;
    }
    // Full navigation so the new httpOnly cookie is always sent on the next
    // request; router.push + router.refresh can refresh /login and block the redirect.
    window.location.assign(from);
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-catalog-border bg-catalog-panel p-8 shadow-catalog-lg">
      <h1 className="mb-2 text-center text-2xl font-semibold text-catalog-ink">
        Satellite Catalog
      </h1>
      <p className="mb-8 text-center text-sm text-catalog-muted">
        Sign in with your Directus account
      </p>
      <form className="flex flex-col gap-4" onSubmit={(e) => void submit(e)}>
        <label className="text-sm text-catalog-muted">
          Email
          <input
            type="email"
            autoComplete="username"
            required
            className="mt-1 w-full rounded-lg border border-catalog-border bg-white px-3 py-2 text-catalog-ink focus:border-catalog-accent focus:outline-none focus:ring-1 focus:ring-catalog-accent/40"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="text-sm text-catalog-muted">
          Password
          <input
            type="password"
            autoComplete="current-password"
            required
            className="mt-1 w-full rounded-lg border border-catalog-border bg-white px-3 py-2 text-catalog-ink focus:border-catalog-accent focus:outline-none focus:ring-1 focus:ring-catalog-accent/40"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && (
          <p className="text-center text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-catalog-accent py-2.5 text-sm font-medium text-white shadow-sm hover:bg-catalog-accent-hover disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
