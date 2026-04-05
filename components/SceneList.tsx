"use client";

import { memo, useEffect, useMemo, useState } from "react";
import type { NormalizedScene } from "@/lib/types";

const PAGE = 20;

export interface SceneListProps {
  scenes: NormalizedScene[];
  selectedSceneId: string | null;
  onSelect: (sceneId: string) => void;
  onSave: (scene: NormalizedScene) => void;
  savingId: string | null;
}

function SceneListInner({
  scenes,
  selectedSceneId,
  onSelect,
  onSave,
  savingId,
}: SceneListProps) {
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(scenes.length / PAGE));
  const slice = useMemo(() => {
    const start = page * PAGE;
    return scenes.slice(start, start + PAGE);
  }, [scenes, page]);

  useEffect(() => {
    if (page > totalPages - 1) setPage(Math.max(0, totalPages - 1));
  }, [page, totalPages]);

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-700/80 bg-slate-900/80 p-3 text-xs text-slate-200">
      <div className="flex items-center justify-between text-slate-400">
        <span>{scenes.length} scenes</span>
        <div className="flex gap-1">
          <button
            type="button"
            className="rounded bg-slate-800 px-2 py-0.5 disabled:opacity-40"
            disabled={page <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Prev
          </button>
          <span className="px-2 py-0.5">
            {page + 1}/{totalPages}
          </span>
          <button
            type="button"
            className="rounded bg-slate-800 px-2 py-0.5 disabled:opacity-40"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          >
            Next
          </button>
        </div>
      </div>
      <ul className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
        {slice.map((s) => (
          <li
            key={s.scene_id}
            className={`cursor-pointer rounded-lg border p-2 transition ${
              selectedSceneId === s.scene_id
                ? "border-sky-500 bg-sky-950/50"
                : "border-slate-700 hover:border-slate-500"
            }`}
            onClick={() => onSelect(s.scene_id)}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] text-slate-400">
                {s.scene_id.slice(0, 36)}
                {s.scene_id.length > 36 ? "…" : ""}
              </span>
              {s.is_high_resolution && (
                <span className="rounded bg-amber-600/30 px-1.5 py-0.5 text-[10px] text-amber-200">
                  HR
                </span>
              )}
              <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px]">
                {s.resolution}m
              </span>
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-slate-500">
              <span>{new Date(s.datetime).toLocaleDateString()}</span>
              <span>{s.cloud_cover.toFixed(0)}% cloud</span>
            </div>
            <div className="mt-1 text-[10px] text-slate-500">{s.provider}</div>
            <button
              type="button"
              className="mt-2 w-full rounded bg-slate-800 py-1 text-[11px] hover:bg-slate-700"
              disabled={savingId === s.scene_id}
              onClick={(e) => {
                e.stopPropagation();
                onSave(s);
              }}
            >
              {savingId === s.scene_id ? "Saving…" : "Save scene"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const SceneList = memo(SceneListInner);
