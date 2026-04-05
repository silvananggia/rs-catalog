"use client";

import Image from "next/image";
import { memo, useEffect, useRef, useState } from "react";
import type { NormalizedScene } from "@/lib/types";
import { computeNDVI, sceneSupportsNdvi } from "@/lib/ndvi";

export interface SceneDetailProps {
  scene: NormalizedScene | null;
  onClose: () => void;
}

function SceneDetailInner({ scene, onClose }: SceneDetailProps) {
  const [ndviError, setNdviError] = useState<string | null>(null);
  const [ndviBusy, setNdviBusy] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setNdviError(null);
    const c = canvasRef.current;
    if (c) {
      const ctx = c.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, c.width, c.height);
    }
  }, [scene?.scene_id]);

  if (!scene) return null;

  const thumbSrc = scene.is_high_resolution
    ? `/api/highres/${encodeURIComponent(scene.scene_id)}`
    : scene.thumbnail_url;

  const showAssets = !scene.is_high_resolution && scene.assets;

  const runNdvi = async () => {
    if (!sceneSupportsNdvi(scene)) return;
    setNdviBusy(true);
    setNdviError(null);
    try {
      const imgData = await computeNDVI(scene);
      const c = canvasRef.current;
      if (c) {
        c.width = imgData.width;
        c.height = imgData.height;
        const ctx = c.getContext("2d");
        if (ctx) ctx.putImageData(imgData, 0, 0);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "NDVI failed";
      setNdviError(msg);
    } finally {
      setNdviBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-600 bg-slate-950 p-6 text-slate-100 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold text-white">Scene</h3>
            <p className="break-all font-mono text-xs text-slate-400">
              {scene.scene_id}
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg bg-slate-800 px-3 py-1 text-sm hover:bg-slate-700"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {thumbSrc && (
          <div className="relative mb-4 aspect-video w-full overflow-hidden rounded-lg bg-slate-900">
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

        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
          <dt className="text-slate-500">Collection</dt>
          <dd>{scene.collection}</dd>
          <dt className="text-slate-500">Datetime</dt>
          <dd>{new Date(scene.datetime).toISOString()}</dd>
          <dt className="text-slate-500">Cloud</dt>
          <dd>{scene.cloud_cover.toFixed(1)}%</dd>
          <dt className="text-slate-500">Resolution</dt>
          <dd>{scene.resolution} m</dd>
          <dt className="text-slate-500">Provider</dt>
          <dd>{scene.provider}</dd>
          <dt className="text-slate-500">High resolution</dt>
          <dd>{scene.is_high_resolution ? "Yes (restricted)" : "No"}</dd>
        </dl>

        {showAssets && (
          <div className="mt-4">
            <h4 className="mb-2 text-xs font-semibold uppercase text-slate-500">
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
                    className="text-sky-400 hover:underline"
                  >
                    {k}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {sceneSupportsNdvi(scene) && (
          <div className="mt-4 border-t border-slate-700 pt-4">
            <button
              type="button"
              disabled={ndviBusy}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm hover:bg-emerald-600 disabled:opacity-50"
              onClick={() => void runNdvi()}
            >
              {ndviBusy ? "Computing NDVI…" : "NDVI preview (COG)"}
            </button>
            {ndviError && (
              <p className="mt-2 text-xs text-red-400">{ndviError}</p>
            )}
            <canvas
              ref={canvasRef}
              className="mt-3 max-h-64 w-full rounded border border-slate-700 bg-black"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export const SceneDetail = memo(SceneDetailInner);
