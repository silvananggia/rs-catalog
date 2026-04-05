import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
      <p className="text-slate-400">
        Search STAC collections, save scenes, run ingestion jobs, and track
        high-resolution previews — all from one catalog.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/catalog"
          className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 text-sky-300 hover:border-sky-600"
        >
          <h2 className="text-lg font-medium text-white">Catalog</h2>
          <p className="mt-2 text-sm text-slate-400">
            Map + STAC search, filters, and scene detail
          </p>
        </Link>
        <Link
          href="/saved"
          className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 text-sky-300 hover:border-sky-600"
        >
          <h2 className="text-lg font-medium text-white">Saved scenes</h2>
          <p className="mt-2 text-sm text-slate-400">
            Scenes you have bookmarked in Directus
          </p>
        </Link>
        <Link
          href="/jobs"
          className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 text-sky-300 hover:border-sky-600"
        >
          <h2 className="text-lg font-medium text-white">Ingestion jobs</h2>
          <p className="mt-2 text-sm text-slate-400">
            Status of bulk and single ingest runs
          </p>
        </Link>
      </div>
    </div>
  );
}
