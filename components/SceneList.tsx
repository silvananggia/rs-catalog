"use client";

import { memo, useEffect, useMemo, useState } from "react";
import type { NormalizedScene } from "@/lib/types";
import { getScenePreviewImageUrl } from "@/lib/scene-preview";

const PAGE = 20;

function SceneThumb({
  scene,
  isAuthenticated,
}: {
  scene: NormalizedScene;
  isAuthenticated: boolean;
}) {
  const src = getScenePreviewImageUrl(scene, isAuthenticated);
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-md border border-catalog-border bg-catalog-canvas text-[9px] leading-tight text-catalog-muted">
        No preview
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- external STAC URLs
    <img
      src={src}
      alt=""
      className="h-[4.5rem] w-[4.5rem] shrink-0 rounded-md border border-catalog-border object-cover"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

export interface SceneListProps {
  scenes: NormalizedScene[];
  selectedSceneId: string | null;
  onSelect: (sceneId: string) => void;
  onSave: (scene: NormalizedScene) => void;
  savingId: string | null;
  /** Show “Save scene” for analysts/admins */
  showSave?: boolean;
  onAddToCart: (scene: NormalizedScene) => void;
  inCart: (sceneId: string) => boolean;
  /** Tighter layout for bottom dock */
  compact?: boolean;
  /** Full-height column with internal scroll (right sidebar) */
  sidePanel?: boolean;
  isAuthenticated: boolean;
  onVisualizeOnMap?: (scene: NormalizedScene) => void;
  visualizeSceneId?: string | null;
}

function SceneListInner({
  scenes,
  selectedSceneId,
  onSelect,
  onSave,
  savingId,
  showSave = false,
  onAddToCart,
  inCart,
  compact = false,
  sidePanel = false,
  isAuthenticated,
  onVisualizeOnMap,
  visualizeSceneId,
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
    <div
      className={`flex flex-col gap-2 rounded-xl border border-catalog-border bg-catalog-surface/95 text-xs text-catalog-ink ${
        sidePanel ? "h-full min-h-0 flex-1 p-3" : compact ? "p-2" : "p-3"
      }`}
    >
      <div className="flex items-center justify-between text-catalog-muted">
        <span className="font-medium text-catalog-ink">
          {scenes.length} scene{scenes.length !== 1 ? "s" : ""}
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            className="rounded bg-catalog-raised px-2 py-0.5 text-catalog-ink disabled:opacity-40"
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
            className="rounded bg-catalog-raised px-2 py-0.5 text-catalog-ink disabled:opacity-40"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          >
            Next
          </button>
        </div>
      </div>
      <ul
        className={`space-y-2 overflow-y-auto pr-1 ${
          sidePanel
            ? "min-h-0 flex-1"
            : compact
              ? "max-h-[min(28vh,260px)]"
              : "max-h-[420px]"
        }`}
      >
        {slice.map((s) => (
          <li
            key={s.scene_id}
            className={`cursor-pointer rounded-lg border p-2 transition ${
              selectedSceneId === s.scene_id
                ? "border-catalog-accent/40 bg-catalog-accent-muted shadow-sm ring-1 ring-catalog-accent/15"
                : "border-catalog-border hover:border-catalog-line"
            }`}
            onClick={() => onSelect(s.scene_id)}
          >
            <div className="flex gap-3">
              <SceneThumb scene={s} isAuthenticated={isAuthenticated} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] text-catalog-muted">
                    {s.scene_id.slice(0, 28)}
                    {s.scene_id.length > 28 ? "…" : ""}
                  </span>
                  {s.is_high_resolution && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-900">
                      HR
                    </span>
                  )}
                  <span className="rounded bg-catalog-raised px-1.5 py-0.5 text-[10px] text-catalog-muted">
                    {s.resolution}m
                  </span>
                </div>
                <div className="mt-1 flex justify-between text-[11px] text-catalog-muted">
                  <span>{new Date(s.datetime).toLocaleDateString()}</span>
                  <span>{s.cloud_cover.toFixed(0)}% cloud</span>
                </div>
                <div className="mt-0.5 text-[10px] text-catalog-muted">
                  {s.provider}
                </div>
              </div>
            </div>
            <div className="mt-2 flex flex-col gap-1">
              {onVisualizeOnMap && (
                <button
                  type="button"
                  className={`w-full rounded py-1 text-[11px] ${
                    visualizeSceneId === s.scene_id
                      ? "bg-catalog-accent-muted text-catalog-ink ring-1 ring-catalog-accent/50"
                      : "bg-catalog-raised text-catalog-ink hover:bg-catalog-border/60"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onVisualizeOnMap(s);
                  }}
                >
                  {visualizeSceneId === s.scene_id
                    ? "Shown on map"
                    : "Visualize on map"}
                </button>
              )}
              <button
                type="button"
                className="w-full rounded bg-catalog-accent/90 py-1 text-[11px] text-white hover:bg-catalog-accent disabled:opacity-40"
                disabled={inCart(s.scene_id)}
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCart(s);
                }}
              >
                {inCart(s.scene_id) ? "In cart" : "Add to cart"}
              </button>
              {showSave && (
                <button
                  type="button"
                  className="w-full rounded bg-catalog-raised py-1 text-[11px] text-catalog-ink hover:bg-catalog-border/60"
                  disabled={savingId === s.scene_id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSave(s);
                  }}
                >
                  {savingId === s.scene_id ? "Saving…" : "Save to workspace"}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const SceneList = memo(SceneListInner);
