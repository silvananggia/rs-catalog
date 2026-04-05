"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useState } from "react";

/**
 * Layout khusus panel admin — terpisah dari {@link AppShell} (workspace).
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/catalog";
  };

  const workspaceNav = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/catalog", label: "Catalog" },
    { href: "/saved", label: "Saved" },
    { href: "/jobs", label: "Jobs" },
  ];

  const onNav = useCallback(() => setOpen(false), []);

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-56 transform border-r border-slate-800 bg-slate-900 transition-transform md:relative md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="border-b border-slate-800 px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-amber-400/90">
            Admin panel
          </div>
          <div className="mt-0.5 text-sm font-semibold text-white">
            RS Catalog
          </div>
        </div>
        <div className="px-3 py-2">
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
            Workspace
          </p>
          <nav className="flex flex-col gap-0.5">
            {workspaceNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNav}
                className={`rounded-lg px-3 py-2 text-sm ${
                  pathname === item.href || pathname.startsWith(`${item.href}/`)
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="absolute bottom-0 left-0 right-0 border-t border-slate-800 p-3">
          <p className="mb-2 text-[10px] text-slate-500">
            Anda sedang di area admin (user &amp; konfigurasi).
          </p>
          <button
            type="button"
            className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 text-sm text-slate-200 hover:bg-slate-700"
            onClick={() => void logout()}
          >
            Log out
          </button>
        </div>
      </aside>
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/95 px-4 md:hidden">
          <button
            type="button"
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200"
            onClick={() => setOpen(true)}
          >
            Menu
          </button>
          <span className="text-sm font-medium text-amber-400/90">Admin</span>
        </header>
        <main className="flex-1 overflow-auto bg-slate-100 p-4 text-catalog-ink md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
