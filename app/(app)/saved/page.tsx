"use client";

import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";

interface SceneExpand {
  scene_id: string;
  datetime: string;
  cloud_cover: number;
  thumbnail_url: string | null;
  is_high_resolution: boolean;
  resolution: number;
}

interface SavedRow {
  id: string;
  scene_id: SceneExpand | string;
}

export default function SavedPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["saved"],
    queryFn: async () => {
      const res = await fetch("/api/saved");
      if (!res.ok) throw new Error("Failed to load");
      const j = (await res.json()) as { saved: SavedRow[] };
      return j.saved;
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-white">Saved scenes</h1>
      <p className="text-sm text-slate-400">
        Bookmarks stored in Directus.{" "}
        <Link href="/catalog" className="text-sky-400 hover:underline">
          Search the catalog
        </Link>
      </p>
      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl bg-slate-800/80"
            />
          ))}
        </div>
      )}
      {error && (
        <p className="text-red-400">Could not load saved scenes.</p>
      )}
      {data && data.length === 0 && (
        <p className="text-slate-500">No saved scenes yet.</p>
      )}
      <ul className="grid gap-4 sm:grid-cols-2">
        {data?.map((row) => {
          const s = typeof row.scene_id === "object" ? row.scene_id : null;
          const thumb = s?.is_high_resolution
            ? `/api/highres/${encodeURIComponent(s.scene_id)}`
            : s?.thumbnail_url;
          return (
            <li
              key={row.id}
              className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900/60"
            >
              <div className="relative aspect-video bg-slate-950">
                {thumb && s && !s.is_high_resolution && (
                  <Image
                    src={thumb}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 400px"
                    unoptimized={thumb.startsWith("http")}
                  />
                )}
                {thumb && s?.is_high_resolution && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumb}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="p-3 text-xs text-slate-300">
                <div className="font-mono text-[10px] text-slate-500">
                  {s?.scene_id ?? String(row.scene_id)}
                </div>
                {s && (
                  <div className="mt-1 flex justify-between text-slate-400">
                    <span>{new Date(s.datetime).toLocaleDateString()}</span>
                    <span>{s.cloud_cover.toFixed(0)}% cloud</span>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
