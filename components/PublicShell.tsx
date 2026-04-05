"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { Role } from "@/lib/types";
import { CartDrawer } from "@/components/CartDrawer";
import { useCart } from "@/lib/cart-context";

export function PublicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { count, toggle } = useCart();
  const [role, setRole] = useState<Role | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/auth/me");
    const j = (await res.json()) as {
      user: { role: Role; email: string } | null;
    };
    setRole(j.user?.role ?? null);
    setEmail(j.user?.email ?? null);
  }, []);

  useEffect(() => {
    void load();
  }, [load, pathname]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/catalog";
  };

  const catalogFullBleed = pathname === "/catalog";

  return (
    <div className="flex min-h-screen flex-col bg-catalog-canvas text-catalog-ink">
      <header className="sticky top-0 z-50 border-b border-catalog-border bg-catalog-panel/95 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1800px] items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex items-center gap-6">
            <Link href="/catalog" className="group flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-catalog-accent text-xs font-bold text-white shadow-sm">
                RS
              </span>
              <span className="text-sm font-semibold tracking-tight text-catalog-ink group-hover:text-catalog-accent">
                Data Catalog
              </span>
            </Link>
            <nav className="hidden gap-4 text-sm text-catalog-muted sm:flex">
              <Link
                href="/catalog"
                className={
                  pathname === "/catalog"
                    ? "text-catalog-ink"
                    : "hover:text-catalog-ink/90"
                }
              >
                Browse
              </Link>
              <Link
                href="/checkout"
                className={
                  pathname === "/checkout"
                    ? "text-catalog-ink"
                    : "hover:text-catalog-ink/90"
                }
              >
                Cart / checkout
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="relative rounded-lg border border-catalog-border bg-catalog-raised px-3 py-2 text-sm text-catalog-ink hover:bg-catalog-border/40"
              onClick={() => toggle()}
            >
              Cart
              {count > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-700 px-1 text-[10px] font-bold text-white">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </button>
            {email ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard"
                  className="hidden rounded-lg bg-catalog-raised px-3 py-2 text-sm text-catalog-ink hover:bg-catalog-border/40 md:inline-block"
                >
                  Workspace
                </Link>
                <span className="hidden max-w-[140px] truncate text-xs text-catalog-muted md:inline">
                  {role ? `${role} · ` : ""}
                  {email}
                </span>
                <button
                  type="button"
                  className="rounded-lg px-3 py-2 text-sm text-catalog-muted hover:bg-catalog-raised hover:text-catalog-ink"
                  onClick={() => void logout()}
                >
                  Log out
                </button>
              </div>
            ) : (
              <Link
                href={`/login?from=${encodeURIComponent(pathname || "/catalog")}`}
                className="rounded-lg bg-catalog-accent px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-catalog-accent-hover"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>
      <main
        className={
          catalogFullBleed
            ? "w-full flex-1 p-0"
            : "mx-auto w-full max-w-[1600px] flex-1 p-4 md:p-6"
        }
      >
        {children}
      </main>
      <CartDrawer />
    </div>
  );
}
