"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useCart } from "@/lib/cart-context";
import type { NormalizedScene } from "@/lib/types";

type LinkRow = { scene_id: string; label: string; href: string };

export default function CheckoutPage() {
  const { lines, remove, clear, count } = useCart();
  const [user, setUser] = useState<{ email: string } | null | undefined>(
    undefined
  );
  const [links, setLinks] = useState<LinkRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMe = useCallback(async () => {
    const res = await fetch("/api/auth/me");
    const j = (await res.json()) as { user: { email: string } | null };
    setUser(j.user);
  }, []);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  const scenes: NormalizedScene[] = lines.map((l) => l.snapshot);

  const requestDownloads = async () => {
    setBusy(true);
    setError(null);
    setLinks(null);
    try {
      const res = await fetch("/api/download/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenes }),
      });
      const j = (await res.json()) as {
        error?: string;
        items?: LinkRow[];
      };
      if (!res.ok) {
        setError(j.error ?? "Request failed");
        return;
      }
      setLinks(j.items ?? []);
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  };

  if (user === undefined) {
    return (
      <div className="rounded-xl border border-catalog-border bg-white p-8 text-catalog-muted">
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-catalog-ink">
          Cart & checkout
        </h1>
        <p className="mt-1 text-sm text-catalog-muted">
          Review selected scenes. Download links are issued only after you sign
          in (similar to EarthExplorer / Copernicus ordering flows).
        </p>
      </div>

      {!user && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-medium">Sign in required for downloads</p>
          <p className="mt-1 text-amber-900/85">
            You can browse and build a cart as a guest. To retrieve asset URLs,
            sign in with your account.
          </p>
          <Link
            href="/login?from=%2Fcheckout"
            className="mt-3 inline-block rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500"
          >
            Sign in
          </Link>
        </div>
      )}

      <section className="rounded-xl border border-catalog-border bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-catalog-muted">
          Items ({count})
        </h2>
        {count === 0 ? (
          <p className="mt-3 text-sm text-catalog-muted">
            Your cart is empty.{" "}
            <Link
              href="/catalog"
              className="text-catalog-accent hover:underline"
            >
              Browse catalog
            </Link>
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {lines.map((line) => (
              <li
                key={line.scene_id}
                className="flex flex-wrap items-start justify-between gap-2 border-b border-catalog-border pb-3 last:border-0"
              >
                <div>
                  <p className="break-all font-mono text-xs text-catalog-ink">
                    {line.scene_id}
                  </p>
                  <p className="text-xs text-catalog-muted">
                    {line.snapshot.collection} ·{" "}
                    {new Date(line.snapshot.datetime).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  className="text-xs text-red-600 hover:underline"
                  onClick={() => remove(line.scene_id)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        {count > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!user || busy}
              className="rounded-lg bg-catalog-accent px-4 py-2 text-sm font-medium text-white hover:bg-catalog-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => void requestDownloads()}
            >
              {busy ? "Preparing…" : "Get download links"}
            </button>
            <button
              type="button"
              className="rounded-lg border border-catalog-border px-4 py-2 text-sm text-catalog-ink hover:bg-catalog-raised"
              onClick={() => {
                clear();
                setLinks(null);
                setError(null);
              }}
            >
              Clear cart
            </button>
          </div>
        )}
      </section>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {links && links.length > 0 && (
        <section className="rounded-xl border border-catalog-border bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-catalog-ink">
            Download links
          </h2>
          <p className="mt-1 text-xs text-catalog-muted">
            Direct asset URLs from STAC metadata. Use according to each
            provider&apos;s terms.
          </p>
          <ul className="mt-3 max-h-96 space-y-2 overflow-y-auto text-sm">
            {links.map((row, i) => (
              <li key={`${row.scene_id}-${row.label}-${i}`}>
                <span className="text-catalog-muted">
                  {row.scene_id.slice(0, 24)}…
                </span>{" "}
                <a
                  href={row.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-catalog-accent hover:underline"
                >
                  {row.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
