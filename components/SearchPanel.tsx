"use client";

import { useEffect, useMemo, useState } from "react";
import type { MergedCatalogSettings } from "@/lib/catalog-settings";
import type { STACSearchParams } from "@/lib/types";
import type { BBoxTuple } from "@/lib/types";
import { useToast } from "@/lib/toast-context";

export const STAC_COLLECTION_IDS: Record<string, string> = {
  "sentinel-2": "sentinel-2-l2a",
  landsat: "landsat-c2-l2",
  worldview: "worldview",
  pleiades: "pleiades",
};

const COLLECTION_OPTIONS: {
  stacId: string;
  title: string;
  blurb: string;
  badge?: string;
}[] = [
  {
    stacId: STAC_COLLECTION_IDS["sentinel-2"],
    title: "Sentinel-2 L2A",
    blurb: "10 m · multispectral · global revisit",
    badge: "ESA",
  },
  {
    stacId: STAC_COLLECTION_IDS.landsat,
    title: "Landsat C2 L2",
    blurb: "30 m · long archive · surface reflectance",
    badge: "USGS",
  },
  {
    stacId: STAC_COLLECTION_IDS.worldview,
    title: "WorldView",
    blurb: "High-res commercial (where available)",
    badge: "MAXAR",
  },
  {
    stacId: STAC_COLLECTION_IDS.pleiades,
    title: "Pléiades",
    blurb: "Very high-res stereo-capable",
    badge: "AIRBUS",
  },
];

export type BboxSourceMode = "drawn" | "map-extent";

export interface SearchPanelProps {
  bbox: BBoxTuple | null;
  onBboxManualChange: (bbox: BBoxTuple) => void;
  onSearch: (params: STACSearchParams) => void;
  isSearching: boolean;
  /** Read current map viewport as WGS84 bbox (map-extent mode) */
  getMapExtentBbox?: () => BBoxTuple | null;
  /** Server-backed defaults (from `/api/catalog/settings`) */
  catalogDefaults?: MergedCatalogSettings | null;
}

const inputClass =
  "rounded-md border border-catalog-border bg-catalog-canvas px-2 py-1.5 font-mono text-[11px] text-catalog-ink placeholder:text-catalog-muted focus:border-catalog-accent focus:outline-none focus:ring-1 focus:ring-catalog-accent/40";

function defaultDateRangeIso(daysBack: number): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - daysBack);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export const SearchPanel = ({
  bbox,
  onBboxManualChange,
  onSearch,
  isSearching,
  getMapExtentBbox,
  catalogDefaults,
}: SearchPanelProps) => {
  const { show } = useToast();
  /** Defaults ~ Indonesia extent (WGS84) */
  const [west, setWest] = useState("95");
  const [south, setSouth] = useState("-11");
  const [east, setEast] = useState("141");
  const [north, setNorth] = useState("6");
  const drDays = catalogDefaults?.dateRangeDaysDefault ?? 14;
  const [startDate, setStartDate] = useState(
    () => defaultDateRangeIso(drDays).start
  );
  const [endDate, setEndDate] = useState(() => defaultDateRangeIso(drDays).end);
  const [cloud, setCloud] = useState(catalogDefaults?.defaultCloudCover ?? 30);
  const [collections, setCollections] = useState<string[]>([
    "sentinel-2-l2a",
    "landsat-c2-l2",
  ]);
  const [bboxSource, setBboxSource] = useState<BboxSourceMode>("drawn");

  const visibleCollectionOptions = useMemo(() => {
    const enabled = catalogDefaults?.enabledCollectionIds;
    if (!enabled?.length) return COLLECTION_OPTIONS;
    const allowed = new Set(enabled);
    return COLLECTION_OPTIONS.filter((o) => allowed.has(o.stacId));
  }, [catalogDefaults?.enabledCollectionIds]);

  useEffect(() => {
    if (!catalogDefaults) return;
    setCloud(catalogDefaults.defaultCloudCover);
    const { start, end } = defaultDateRangeIso(
      catalogDefaults.dateRangeDaysDefault
    );
    setStartDate(start);
    setEndDate(end);
    if (catalogDefaults.enabledCollectionIds?.length) {
      const allowed = new Set(catalogDefaults.enabledCollectionIds);
      const ids = catalogDefaults.enabledCollectionIds;
      setCollections((prev) => {
        const next = prev.filter((c) => allowed.has(c));
        return next.length ? next : [...ids];
      });
    }
  }, [catalogDefaults]);

  useEffect(() => {
    if (!bbox) return;
    const [w, s, e, n] = bbox;
    setWest(String(w));
    setSouth(String(s));
    setEast(String(e));
    setNorth(String(n));
  }, [bbox]);

  const toggleCollection = (stacId: string) => {
    setCollections((c) =>
      c.includes(stacId) ? c.filter((x) => x !== stacId) : [...c, stacId]
    );
  };

  const selectAllCollections = () => {
    setCollections(visibleCollectionOptions.map((o) => o.stacId));
  };

  const clearCollections = () => {
    setCollections([]);
  };

  const runSearch = () => {
    if (collections.length === 0) {
      show("Select at least one collection.", "error");
      return;
    }
    const datetime = `${startDate}T00:00:00Z/${endDate}T23:59:59Z`;
    const base: Omit<STACSearchParams, "bbox"> = {
      datetime,
      cloudCover: cloud,
      collections,
      limit: catalogDefaults?.defaultSearchLimit ?? 50,
    };

    if (bboxSource === "map-extent") {
      const getExt = getMapExtentBbox;
      if (!getExt) {
        show("Map extent is not available.", "error");
        return;
      }
      const bb = getExt();
      if (!bb) {
        show(
          "Could not read the map view. Wait until the map loads, then try again.",
          "error"
        );
        return;
      }
      onSearch({ ...base, bbox: bb });
      return;
    }

    const bb: BBoxTuple = bbox
      ? bbox
      : [
          parseFloat(west) || 0,
          parseFloat(south) || 0,
          parseFloat(east) || 0,
          parseFloat(north) || 0,
        ];
    onSearch({ ...base, bbox: bb });
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 border-0 bg-catalog-panel/95 p-4 text-catalog-ink">
      <div>
        <h2 className="text-[10px] font-semibold uppercase tracking-wider text-catalog-muted">
          STAC search
        </h2>

        <div className="mt-3 flex flex-col gap-2">
          <span className="text-[10px] font-medium text-catalog-muted">
            Bounding box source
          </span>
          <label className="flex cursor-pointer items-start gap-2 text-[11px] text-catalog-ink">
            <input
              type="radio"
              name="bbox-source"
              className="mt-0.5 text-catalog-accent focus:ring-catalog-accent/40"
              checked={bboxSource === "drawn"}
              onChange={() => setBboxSource("drawn")}
            />
            <span>
              <span className="font-medium">Drawn area / coordinates</span>
              <span className="mt-0.5 block text-[10px] text-catalog-muted leading-snug">
                Use AOI from map tools or the W/S/E/N fields below
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2 text-[11px] text-catalog-ink">
            <input
              type="radio"
              name="bbox-source"
              className="mt-0.5 text-catalog-accent focus:ring-catalog-accent/40"
              checked={bboxSource === "map-extent"}
              onChange={() => setBboxSource("map-extent")}
            />
            <span>
              <span className="font-medium">Current map view</span>
              <span className="mt-0.5 block text-[10px] text-catalog-muted leading-snug">
                Search matches the visible map extent (pan/zoom first, then run)
              </span>
            </span>
          </label>
        </div>

        {bboxSource === "drawn" && (
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <span className="col-span-2 text-[10px] text-catalog-muted">
              Bounding box (W / S / E / N)
            </span>
            <input
              className={inputClass}
              value={west}
              onChange={(e) => setWest(e.target.value)}
              placeholder="west"
            />
            <input
              className={inputClass}
              value={south}
              onChange={(e) => setSouth(e.target.value)}
              placeholder="south"
            />
            <input
              className={inputClass}
              value={east}
              onChange={(e) => setEast(e.target.value)}
              placeholder="east"
            />
            <input
              className={inputClass}
              value={north}
              onChange={(e) => setNorth(e.target.value)}
              placeholder="north"
            />
            <button
              type="button"
              className="col-span-2 rounded-md border border-catalog-border bg-catalog-raised py-1.5 text-[11px] text-catalog-ink hover:bg-catalog-border/50"
              onClick={() => {
                const bb: BBoxTuple = [
                  parseFloat(west) || 0,
                  parseFloat(south) || 0,
                  parseFloat(east) || 0,
                  parseFloat(north) || 0,
                ];
                onBboxManualChange(bb);
              }}
            >
              Apply coordinates to AOI
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5 text-xs">
        <span className="text-[10px] text-catalog-muted">Date range</span>
        <div className="flex gap-2">
          <input
            type="date"
            className={`flex-1 ${inputClass}`}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <input
            type="date"
            className={`flex-1 ${inputClass}`}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5 text-xs">
        <span className="text-[10px] text-catalog-muted">
          Max cloud: {cloud}%
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={cloud}
          onChange={(e) => setCloud(Number(e.target.value))}
          className="w-full accent-blue-600"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-catalog-muted">
              Collections
            </span>
            <p className="mt-0.5 text-[10px] leading-snug text-catalog-muted">
              Choose which STAC collections to query. More sources may slow the
              response.
            </p>
          </div>
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={selectAllCollections}
              className="rounded px-1.5 py-0.5 text-[10px] font-medium text-catalog-accent hover:bg-catalog-accent-muted/80"
            >
              All
            </button>
            <button
              type="button"
              onClick={clearCollections}
              className="rounded px-1.5 py-0.5 text-[10px] font-medium text-catalog-muted hover:bg-catalog-raised hover:text-catalog-ink"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-1.5">
          {visibleCollectionOptions.map((opt) => {
            const active = collections.includes(opt.stacId);
            return (
              <button
                key={opt.stacId}
                type="button"
                role="checkbox"
                aria-checked={active}
                onClick={() => toggleCollection(opt.stacId)}
                className={`group flex w-full items-start gap-2.5 rounded-lg border px-2.5 py-2 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-catalog-accent/35 focus-visible:ring-offset-1 focus-visible:ring-offset-catalog-panel ${
                  active
                    ? "border-catalog-accent/50 bg-catalog-accent-muted shadow-sm ring-1 ring-catalog-accent/15"
                    : "border-catalog-border bg-catalog-raised/40 hover:border-catalog-line hover:bg-catalog-raised/70"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[9px] font-bold ${
                    active
                      ? "border-catalog-accent bg-catalog-accent text-white"
                      : "border-catalog-line bg-catalog-panel text-transparent group-hover:border-catalog-muted"
                  }`}
                  aria-hidden
                >
                  ✓
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[12px] font-medium leading-tight text-catalog-ink">
                      {opt.title}
                    </span>
                    {opt.badge && (
                      <span className="rounded bg-catalog-panel px-1 py-px text-[9px] font-medium uppercase tracking-wide text-catalog-muted ring-1 ring-catalog-border">
                        {opt.badge}
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-[10px] leading-snug text-catalog-muted">
                    {opt.blurb}
                  </span>
                  <span className="mt-1 font-mono text-[9px] text-catalog-line">
                    {opt.stacId}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {collections.length === 0 && (
          <p className="rounded-md border border-amber-200/80 bg-amber-50/90 px-2 py-1.5 text-[10px] text-amber-900">
            No collections selected — choose at least one to run a search.
          </p>
        )}
      </div>

      <button
        type="button"
        disabled={isSearching || collections.length === 0}
        className="mt-auto rounded-lg bg-catalog-accent py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-catalog-accent-hover disabled:opacity-50"
        onClick={runSearch}
      >
        {isSearching ? "Searching…" : "Run search"}
      </button>
    </div>
  );
};
