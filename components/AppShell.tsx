"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { Role } from "@/lib/types";

const nav: Array<{ href: string; label: string }> = [
  { href: "/dashboard", label: "Home" },
  { href: "/catalog", label: "Catalog" },
  { href: "/saved", label: "Saved" },
  { href: "/jobs", label: "Jobs" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Role | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/auth/me");
    const j = (await res.json()) as {
      user: { role: Role } | null;
    };
    setRole(j.user?.role ?? null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/catalog";
  };

  return (
    <div className="flex min-h-screen bg-catalog-canvas text-catalog-ink">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-56 transform border-r border-catalog-border bg-white shadow-sm backdrop-blur transition-transform md:relative md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex h-14 items-center border-b border-catalog-border px-4 text-sm font-semibold tracking-wide text-catalog-accent">
          RS Catalog
        </div>
        <nav className="flex flex-col gap-1 p-2">
          {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm ${
                  pathname === item.href || pathname.startsWith(`${item.href}/`)
                    ? "bg-catalog-accent-muted font-medium text-catalog-accent"
                    : "text-catalog-muted hover:bg-catalog-raised hover:text-catalog-ink"
                }`}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t border-catalog-border bg-catalog-canvas/80 p-3 text-xs text-catalog-muted">
          {role && <div className="mb-2 capitalize">Role: {role}</div>}
          <button
            type="button"
            className="w-full rounded-lg border border-catalog-border bg-white py-2 text-catalog-ink hover:bg-catalog-raised"
            onClick={() => void logout()}
          >
            Log out
          </button>
        </div>
      </aside>
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b border-catalog-border bg-white/90 px-4 md:hidden">
          <button
            type="button"
            className="rounded-lg border border-catalog-border bg-catalog-raised px-3 py-2 text-sm text-catalog-ink"
            onClick={() => setOpen(true)}
          >
            Menu
          </button>
          <span className="text-sm font-medium text-catalog-ink">RS Catalog</span>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
