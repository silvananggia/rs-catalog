"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useRef, useState } from "react";
import type OlMap from "ol/Map";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BasemapSelector } from "@/components/BasemapSelector";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { MapToolButtons } from "@/components/MapToolButtons";
import { SceneDetail } from "@/components/SceneDetail";
import { SceneList } from "@/components/SceneList";
import { SearchPanel } from "@/components/SearchPanel";
import { useCart } from "@/lib/cart-context";
import type { BasemapId } from "@/lib/map-basemaps";
import { searchSTAC } from "@/lib/stac";
import type { NormalizedScene, STACSearchParams } from "@/lib/types";
import type { BBoxTuple } from "@/lib/types";
import type {
  BboxDrawVisual,
  MapTool,
  MapVisualizationTarget,
} from "@/components/Map";
import { getScenePreviewImageUrl } from "@/lib/scene-preview";
import {
  buildTitilerXyzUrlFromCog,
  pickCogHrefForTitiler,
} from "@/lib/titiler";
import { getMapViewBBoxWgs84 } from "@/lib/map-extent";
import { useToast } from "@/lib/toast-context";

const Map = dynamic(
  () => import("@/components/Map").then((m) => m.Map),
  { ssr: false, loading: () => <MapSkeleton /> }
);

function MapSkeleton() {
  return (
    <div className="h-full min-h-[200px] w-full animate-pulse bg-catalog-surface" />
  );
}

/** Default AOI ~ Indonesia (WGS84) when bbox is unset */
const DEFAULT_BBOX: BBoxTuple = [95, -11, 141, 6];

export function CatalogView() {
  const { show } = useToast();
  const { add, has } = useCart();
  const [scenes, setScenes] = useState<NormalizedScene[]>([]);
  const [bbox, setBbox] = useState<BBoxTuple | null>(null);
  const [basemap, setBasemap] = useState<BasemapId>("osm");
  const [activeTool, setActiveTool] = useState<MapTool>("none");
  const [bboxDrawVisual, setBboxDrawVisual] =
    useState<BboxDrawVisual>("fill");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [visualizeSceneId, setVisualizeSceneId] = useState<string | null>(null);
  const olMapRef = useRef<OlMap | null>(null);

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me");
      const j = (await res.json()) as {
        user: { role: string } | null;
      };
      return j.user ?? null;
    },
  });

  const searchMutation = useMutation({
    mutationFn: (p: STACSearchParams) => searchSTAC(p),
    onSuccess: (data) => {
      setScenes(data);
      setVisualizeSceneId(null);
    },
    onError: (e: Error) => {
      show(e.message, "error");
    },
  });

  const onSearch = useCallback(
    (p: STACSearchParams) => {
      searchMutation.mutate(p);
    },
    [searchMutation]
  );

  const selected = scenes.find((s) => s.scene_id === selectedId) ?? null;

  const isAuthenticated = Boolean(me);

  const visualizeTarget = useMemo((): MapVisualizationTarget | null => {
    if (!visualizeSceneId) return null;
    const scene = scenes.find((s) => s.scene_id === visualizeSceneId);
    if (!scene) return null;
    const cog = pickCogHrefForTitiler(scene);
    const titilerXyzUrl = cog ? buildTitilerXyzUrlFromCog(cog) : null;
    return {
      sceneId: scene.scene_id,
      bbox: scene.bbox,
      titilerXyzUrl,
      imageUrl: getScenePreviewImageUrl(scene, isAuthenticated),
    };
  }, [visualizeSceneId, scenes, isAuthenticated]);

  const handleVisualizeOnMap = useCallback(
    (scene: NormalizedScene) => {
      setVisualizeSceneId(scene.scene_id);
      setSelectedId(scene.scene_id);
      const cog = pickCogHrefForTitiler(scene);
      const titiler = cog ? buildTitilerXyzUrlFromCog(cog) : null;
      const thumb = getScenePreviewImageUrl(scene, isAuthenticated);
      if (!titiler && !thumb) {
        show(
          "No COG or thumbnail for this scene. Map zoomed to scene extent.",
          "info"
        );
      }
    },
    [isAuthenticated, show]
  );

  const canSave = me?.role === "admin" || me?.role === "analyst";

  const saveScene = async (scene: NormalizedScene) => {
    setSavingId(scene.scene_id);
    try {
      const res = await fetch("/api/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scene }),
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        throw new Error(j.error ?? "Save failed");
      }
      show("Scene saved", "success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed";
      show(msg, "error");
    } finally {
      setSavingId(null);
    }
  };

  const runIngest = async (mode: "single" | "bulk") => {
    const p: STACSearchParams = {
      bbox: bbox ?? DEFAULT_BBOX,
      datetime: "2024-01-01T00:00:00Z/2024-06-01T23:59:59Z",
      cloudCover: 30,
      collections: ["sentinel-2-l2a", "landsat-c2-l2"],
      limit: mode === "bulk" ? 1000 : 50,
    };
    const res = await fetch("/api/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: p, mode }),
    });
    const j = (await res.json()) as {
      inserted?: number;
      error?: string;
      skipped?: number;
    };
    if (!res.ok) {
      show(j.error ?? "Ingest failed", "error");
      return;
    }
    show(
      `Ingest done: ${j.inserted ?? 0} inserted, ${j.skipped ?? 0} skipped`,
      "success"
    );
  };

  const canIngest = me?.role === "admin" || me?.role === "analyst";

  return (
    <div className="flex h-[calc(100vh-3.5rem)] min-h-[480px] flex-row bg-catalog-canvas">
      <aside className="flex h-full min-h-0 w-[min(100%,22rem)] shrink-0 flex-col overflow-y-auto border-r border-catalog-border bg-catalog-surface shadow-sm">
        <ErrorBoundary>
          <SearchPanel
            bbox={bbox}
            onBboxManualChange={(b) => setBbox(b)}
            onSearch={onSearch}
            isSearching={searchMutation.isPending}
            getMapExtentBbox={() => {
              const m = olMapRef.current;
              if (!m) return null;
              return getMapViewBBoxWgs84(m);
            }}
          />
        </ErrorBoundary>
      </aside>

      <div className="relative min-h-0 min-w-0 flex-1">
        <div className="absolute inset-0 z-0">
          <ErrorBoundary>
            <Map
              scenes={scenes}
              selectedSceneId={selectedId}
              onSelectScene={(id) => setSelectedId(id)}
              basemap={basemap}
              activeTool={activeTool}
              bboxDrawVisual={bboxDrawVisual}
              bboxExtent={bbox}
              onBboxComplete={(b) => {
                setBbox(b);
                setActiveTool("none");
              }}
              visualizeTarget={visualizeTarget}
              onClearVisualization={() => setVisualizeSceneId(null)}
              onMapReady={(m) => {
                olMapRef.current = m;
              }}
            />
          </ErrorBoundary>
        </div>

        <div className="pointer-events-none absolute right-3 top-3 z-20 flex max-w-[min(100%,20rem)] flex-col items-end gap-2">
          {canIngest && (
            <div className="pointer-events-auto flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-catalog-border bg-catalog-panel px-3 py-1.5 text-xs font-medium text-catalog-ink shadow-sm hover:bg-catalog-raised"
                onClick={() => void runIngest("single")}
              >
                Ingest (page)
              </button>
              <button
                type="button"
                className="rounded-lg border border-catalog-accent/30 bg-catalog-accent-muted px-3 py-1.5 text-xs font-medium text-catalog-ink shadow-sm hover:bg-catalog-accent-muted/80"
                onClick={() => void runIngest("bulk")}
              >
                Ingest (bulk)
              </button>
            </div>
          )}
          <MapToolButtons
            activeTool={activeTool}
            onActiveToolChange={setActiveTool}
            bboxDrawVisual={bboxDrawVisual}
            onBboxDrawVisualChange={setBboxDrawVisual}
            onClearBbox={() => setBbox(null)}
          />
          <BasemapSelector basemap={basemap} onBasemapChange={setBasemap} />
        </div>
      </div>

      {scenes.length > 0 && (
        <aside className="flex h-full min-h-0 w-[min(100%,26rem)] shrink-0 flex-col overflow-hidden border-l border-catalog-border bg-catalog-panel/90 p-3">
          <ErrorBoundary>
            <SceneList
              scenes={scenes}
              selectedSceneId={selectedId}
              onSelect={(id) => setSelectedId(id)}
              onSave={(s) => void saveScene(s)}
              savingId={savingId}
              showSave={canSave}
              onAddToCart={(s) => {
                add(s);
                show("Added to cart", "success");
              }}
              inCart={has}
              sidePanel
              isAuthenticated={isAuthenticated}
              onVisualizeOnMap={handleVisualizeOnMap}
              visualizeSceneId={visualizeSceneId}
            />
          </ErrorBoundary>
        </aside>
      )}

      <SceneDetail
        scene={selected}
        onClose={() => setSelectedId(null)}
        isAuthenticated={isAuthenticated}
        onAddToCart={(s) => {
          add(s);
          show("Added to cart", "success");
        }}
        inCart={selected ? has(selected.scene_id) : false}
        onVisualizeOnMap={handleVisualizeOnMap}
        visualizeSceneId={visualizeSceneId}
      />
    </div>
  );
}
