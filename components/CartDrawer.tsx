"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";

export function CartDrawer() {
  const { open, setOpen, lines, remove, count } = useCart();

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[90] bg-black/35 backdrop-blur-sm"
        aria-label="Close cart"
        onClick={() => setOpen(false)}
      />
      <aside className="fixed bottom-0 right-0 top-0 z-[95] flex w-full max-w-md flex-col border-l border-catalog-border bg-catalog-panel shadow-catalog-lg">
        <div className="flex items-center justify-between border-b border-catalog-border px-4 py-3">
          <h2 className="text-lg font-semibold text-catalog-ink">Cart</h2>
          <button
            type="button"
            className="rounded-lg px-3 py-1.5 text-sm text-catalog-muted hover:bg-catalog-raised hover:text-catalog-ink"
            onClick={() => setOpen(false)}
          >
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {count === 0 ? (
            <p className="text-sm text-catalog-muted">
              No scenes yet. Browse the catalog and add items to request
              downloads after sign-in.
            </p>
          ) : (
            <ul className="space-y-3">
              {lines.map((line) => (
                <li
                  key={line.scene_id}
                  className="rounded-lg border border-catalog-border bg-catalog-canvas/80 p-3 text-sm"
                >
                  <p className="break-all font-mono text-[11px] text-catalog-muted">
                    {line.scene_id.slice(0, 48)}
                    {line.scene_id.length > 48 ? "…" : ""}
                  </p>
                  <p className="mt-1 text-xs text-catalog-muted">
                    {line.snapshot.collection} ·{" "}
                    {new Date(line.snapshot.datetime).toLocaleDateString()}
                  </p>
                  <button
                    type="button"
                    className="mt-2 text-xs text-rose-400/90 hover:underline"
                    onClick={() => remove(line.scene_id)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-t border-catalog-border p-4">
          <Link
            href="/checkout"
            className="block w-full rounded-lg bg-catalog-accent py-2.5 text-center text-sm font-medium text-white hover:bg-catalog-accent-hover"
            onClick={() => setOpen(false)}
          >
            Checkout / downloads
          </Link>
          <p className="mt-2 text-center text-[11px] text-catalog-muted">
            Sign in is required to retrieve download links.
          </p>
        </div>
      </aside>
    </>
  );
}
