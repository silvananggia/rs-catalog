"use client";

import { useQuery } from "@tanstack/react-query";
import type { IngestionJob } from "@/lib/types";

export default function JobsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const res = await fetch("/api/jobs");
      if (!res.ok) throw new Error("Failed to load");
      const j = (await res.json()) as { jobs: IngestionJob[] };
      return j.jobs;
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-white">Ingestion jobs</h1>
      <p className="text-sm text-slate-400">
        Recent STAC ingest runs (admin sees all; analysts see their own).
      </p>
      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded-lg bg-slate-800/80"
            />
          ))}
        </div>
      )}
      {error && <p className="text-red-400">Could not load jobs.</p>}
      <div className="overflow-x-auto rounded-xl border border-slate-700">
        <table className="w-full min-w-[600px] text-left text-sm text-slate-300">
          <thead className="border-b border-slate-700 bg-slate-900/80 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Results</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Query</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((job) => (
              <tr key={job.id} className="border-b border-slate-800">
                <td className="px-4 py-3 capitalize text-sky-300">
                  {job.status}
                </td>
                <td className="px-4 py-3">{job.result_count}</td>
                <td className="px-4 py-3 text-slate-500">
                  {new Date(job.created_at).toLocaleString()}
                </td>
                <td className="max-w-xs truncate px-4 py-3 font-mono text-[10px] text-slate-500">
                  {JSON.stringify(job.query_params)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && data.length === 0 && (
        <p className="text-slate-500">No jobs recorded yet.</p>
      )}
    </div>
  );
}
