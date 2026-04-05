"use client";

import Image from "next/image";
import { memo } from "react";
import type { NormalizedScene } from "@/lib/types";
import { getScenePreviewImageUrl } from "@/lib/scene-preview";

export interface SceneDetailProps {
  scene: NormalizedScene | null;
  onClose: () => void;
  /** When false, asset links are gated (download requires login). */
  isAuthenticated: boolean;
  onAddToCart: (scene: NormalizedScene) => void;
  inCart: boolean;
  /** Show preview on map (thumbnail over footprint) */
  onVisualizeOnMap?: (scene: NormalizedScene) => void;
  /** Matches active map visualization */
  visualizeSceneId?: string | null;
}

function SceneDetailInner({
  scene,
  onClose,
  isAuthenticated,
  onAddToCart,
  inCart,
  onVisualizeOnMap,
  visualizeSceneId,
}: SceneDetailProps) {
  if (!scene) return null;

  const thumbSrc = getScenePreviewImageUrl(scene, isAuthenticated);

  const showAssets =
    isAuthenticated && !scene.is_high_resolution && scene.assets;

  const onMapActive = visualizeSceneId === scene.scene_id;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-catalog-border/90 bg-catalog-panel p-6 text-catalog-ink shadow-catalog-lg">
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold text-catalog-ink">Scene</h3>
            <p className="break-all font-mono text-xs text-catalog-muted">
              {scene.scene_id}
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg bg-catalog-raised px-3 py-1 text-sm text-catalog-ink hover:bg-catalog-border/60"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {scene.is_high_resolution && !isAuthenticated && (
          <div className="mb-4 rounded-lg border border-catalog-warning/40 bg-catalog-canvas/80 p-4 text-sm text-catalog-ink/90">
            High-resolution preview requires a signed-in account with the
            appropriate role.
          </div>
        )}

        {thumbSrc && (
          <div className="relative mb-4 aspect-video w-full overflow-hidden rounded-lg bg-catalog-canvas">
            {scene.is_high_resolution ? (
              // eslint-disable-next-line @next/next/no-img-element -- API may redirect/stream
              <img
                src={thumbSrc}
                alt="Preview"
                className="h-full w-full object-contain"
              />
            ) : (
              <Image
                src={thumbSrc}
                alt="Thumbnail"
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 512px"
                unoptimized={
                  thumbSrc.startsWith("http") && !thumbSrc.includes("localhost")
                }
              />
            )}
          </div>
        )}

        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={inCart}
            className="rounded-lg bg-catalog-accent px-3 py-1.5 text-sm text-white hover:bg-catalog-accent-hover disabled:opacity-40"
            onClick={() => onAddToCart(scene)}
          >
            {inCart ? "In cart" : "Add to cart"}
          </button>
          {onVisualizeOnMap && (
            <button
              type="button"
              className={`rounded-lg border px-3 py-1.5 text-sm ${
                onMapActive
                  ? "border-catalog-accent bg-catalog-accent-muted text-catalog-ink"
                  : "border-catalog-border bg-catalog-raised text-catalog-ink hover:bg-catalog-border/50"
              }`}
              onClick={() => onVisualizeOnMap(scene)}
            >
              {onMapActive ? "Shown on map" : "Visualize on map"}
            </button>
          )}
        </div>

        {!isAuthenticated && (
          <p className="mb-4 rounded-lg border border-catalog-border bg-catalog-canvas/90 p-3 text-xs text-catalog-muted">
            <strong className="text-catalog-ink/90">Sign in</strong> to view STAC
            asset links and request downloads from checkout.
          </p>
        )}

        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
          <dt className="text-catalog-muted">Collection</dt>
          <dd>{scene.collection}</dd>
          <dt className="text-catalog-muted">Datetime</dt>
          <dd>{new Date(scene.datetime).toISOString()}</dd>
          <dt className="text-catalog-muted">Cloud</dt>
          <dd>{scene.cloud_cover.toFixed(1)}%</dd>
          <dt className="text-catalog-muted">Resolution</dt>
          <dd>{scene.resolution} m</dd>
          <dt className="text-catalog-muted">Provider</dt>
          <dd>{scene.provider}</dd>
          <dt className="text-catalog-muted">High resolution</dt>
          <dd>{scene.is_high_resolution ? "Yes (restricted)" : "No"}</dd>
        </dl>

        {showAssets && (
          <div className="mt-4">
            <h4 className="mb-2 text-xs font-semibold uppercase text-catalog-muted">
              Assets
            </h4>
            <ul className="max-h-32 space-y-1 overflow-y-auto text-xs">
              {Object.entries(
                scene.assets as Record<string, { href?: string }>
              ).map(([k, v]) => (
                <li key={k}>
                  <a
                    href={v.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-catalog-accent hover:underline"
                  >
                    {k}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export const SceneDetail = memo(SceneDetailInner);
