import { cookies } from "next/headers";
import Link from "next/link";
import { AUTH_COOKIE, getUserRole, roleCanAdmin } from "@/lib/auth";

export default async function DashboardPage() {
  const token = cookies().get(AUTH_COOKIE)?.value;
  const role = token ? await getUserRole(token) : null;
  const showAdmin = role != null && roleCanAdmin(role);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold text-catalog-ink">Dashboard</h1>
      <p className="text-catalog-muted">
        Search STAC collections, save scenes, run ingestion jobs, and track
        high-resolution previews — all from one catalog.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/catalog"
          className="rounded-xl border border-catalog-border bg-catalog-panel p-6 text-catalog-accent shadow-sm hover:border-catalog-accent/40"
        >
          <h2 className="text-lg font-medium text-catalog-ink">Catalog</h2>
          <p className="mt-2 text-sm text-catalog-muted">
            Map + STAC search, filters, and scene detail
          </p>
        </Link>
        <Link
          href="/saved"
          className="rounded-xl border border-catalog-border bg-catalog-panel p-6 text-catalog-accent shadow-sm hover:border-catalog-accent/40"
        >
          <h2 className="text-lg font-medium text-catalog-ink">Saved scenes</h2>
          <p className="mt-2 text-sm text-catalog-muted">
            Scenes you have bookmarked in Directus
          </p>
        </Link>
        <Link
          href="/jobs"
          className="rounded-xl border border-catalog-border bg-catalog-panel p-6 text-catalog-accent shadow-sm hover:border-catalog-accent/40"
        >
          <h2 className="text-lg font-medium text-catalog-ink">Ingestion jobs</h2>
          <p className="mt-2 text-sm text-catalog-muted">
            Status of bulk and single ingest runs
          </p>
        </Link>
        {showAdmin && (
          <Link
            href="/admin"
            className="rounded-xl border border-catalog-border bg-catalog-panel p-6 text-catalog-accent shadow-sm hover:border-catalog-accent/40"
          >
            <h2 className="text-lg font-medium text-catalog-ink">
              Administration
            </h2>
            <p className="mt-2 text-sm text-catalog-muted">
              Users, roles, catalog defaults, and ingest limits
            </p>
          </Link>
        )}
      </div>
    </div>
  );
}
