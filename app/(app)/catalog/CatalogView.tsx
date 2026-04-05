"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SceneDetail } from "@/components/SceneDetail";
import { SceneList } from "@/components/SceneList";
import { SearchPanel } from "@/components/SearchPanel";
import { searchSTAC } from "@/lib/stac";
import type { NormalizedScene, STACSearchParams } from "@/lib/types";
import type { BBoxTuple } from "@/lib/types";
import { useToast } from "@/lib/toast-context";

const Map = dynamic(
  () => import("@/components/Map").then((m) => m.Map),
  { ssr: false, loading: () => <MapSkeleton /> }
);

function MapSkeleton() {
  return (
    <div className="h-full min-h-[320px] animate-pulse rounded-xl bg-slate-800/80" />
  );
}

export function CatalogView() {
  const { show } = useToast();
  const [scenes, setScenes] = useState<NormalizedScene[]>([]);
  const [bbox, setBbox] = useState<BBoxTuple | null>(null);
  const [drawMode, setDrawMode] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me");
      if (!res.ok) return null;
      const j = (await res.json()) as {
        user: { role: string } | null;
      };
      return j.user;
    },
  });

  const searchMutation = useMutation({
    mutationFn: (p: STACSearchParams) => searchSTAC(p),
    onSuccess: (data) => {
      setScenes(data);
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
      bbox: bbox ?? [-10, 35, 10, 55],
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

  const canIngest =
    me?.role === "admin" || me?.role === "analyst";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold text-white">Catalog</h1>
        {canIngest && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
              onClick={() => void runIngest("single")}
            >
              Ingest (single page)
            </button>
            <button
              type="button"
              className="rounded-lg bg-indigo-700 px-3 py-1.5 text-xs text-white hover:bg-indigo-600"
              onClick={() => void runIngest("bulk")}
            >
              Ingest (bulk)
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,280px)_1fr]">
        <ErrorBoundary>
          <SearchPanel
            bbox={bbox}
            onBboxManualChange={(b) => setBbox(b)}
            onSearch={onSearch}
            drawMode={drawMode}
            onToggleDrawMode={() => setDrawMode((d) => !d)}
            isSearching={searchMutation.isPending}
          />
        </ErrorBoundary>
        <ErrorBoundary>
          <Map
            scenes={scenes}
            selectedSceneId={selectedId}
            onSelectScene={(id) => setSelectedId(id)}
            bboxDrawMode={drawMode}
            onBboxComplete={(b) => {
              setBbox(b);
              setDrawMode(false);
            }}
          />
        </ErrorBoundary>
      </div>

      <ErrorBoundary>
        <SceneList
          scenes={scenes}
          selectedSceneId={selectedId}
          onSelect={(id) => setSelectedId(id)}
          onSave={(s) => void saveScene(s)}
          savingId={savingId}
        />
      </ErrorBoundary>

      <SceneDetail
        scene={selected}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
