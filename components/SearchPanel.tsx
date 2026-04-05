"use client";

import { useEffect, useState } from "react";
import type { STACSearchParams } from "@/lib/types";
import type { BBoxTuple } from "@/lib/types";
import { useToast } from "@/lib/toast-context";

export const STAC_COLLECTION_IDS: Record<string, string> = {
  "sentinel-2": "sentinel-2-l2a",
  landsat: "landsat-c2-l2",
  worldview: "worldview",
  pleiades: "pleiades",
};

export type BboxSourceMode = "drawn" | "map-extent";

export interface SearchPanelProps {
  bbox: BBoxTuple | null;
  onBboxManualChange: (bbox: BBoxTuple) => void;
  onSearch: (params: STACSearchParams) => void;
  isSearching: boolean;
  /** Read current map viewport as WGS84 bbox (map-extent mode) */
  getMapExtentBbox?: () => BBoxTuple | null;
}

const inputClass =
  "rounded-md border border-catalog-border bg-catalog-canvas px-2 py-1.5 font-mono text-[11px] text-catalog-ink placeholder:text-catalog-muted focus:border-catalog-accent focus:outline-none focus:ring-1 focus:ring-catalog-accent/40";

function defaultDateRangeIso(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 14);
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
}: SearchPanelProps) => {
  const { show } = useToast();
  /** Defaults ~ Indonesia extent (WGS84) */
  const [west, setWest] = useState("95");
  const [south, setSouth] = useState("-11");
  const [east, setEast] = useState("141");
  const [north, setNorth] = useState("6");
  const [startDate, setStartDate] = useState(() => defaultDateRangeIso().start);
  const [endDate, setEndDate] = useState(() => defaultDateRangeIso().end);
  const [cloud, setCloud] = useState(30);
  const [collections, setCollections] = useState<string[]>([
    "sentinel-2-l2a",
    "landsat-c2-l2",
  ]);
  const [bboxSource, setBboxSource] = useState<BboxSourceMode>("drawn");

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

  const runSearch = () => {
    const datetime = `${startDate}T00:00:00Z/${endDate}T23:59:59Z`;
    const base: Omit<STACSearchParams, "bbox"> = {
      datetime,
      cloudCover: cloud,
      collections,
      limit: 50,
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

      <div className="flex flex-col gap-2 text-xs">
        <span className="text-[10px] text-catalog-muted">Collections</span>
        {Object.entries(STAC_COLLECTION_IDS).map(([label, stacId]) => (
          <label
            key={stacId}
            className="flex cursor-pointer items-center gap-2 text-[11px] text-catalog-ink/95"
          >
            <input
              type="checkbox"
              checked={collections.includes(stacId)}
              onChange={() => toggleCollection(stacId)}
              className="rounded border-catalog-line bg-catalog-canvas text-catalog-accent focus:ring-catalog-accent/40"
            />
            {label}
          </label>
        ))}
      </div>

      <button
        type="button"
        disabled={isSearching}
        className="mt-auto rounded-lg bg-catalog-accent py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-catalog-accent-hover disabled:opacity-50"
        onClick={runSearch}
      >
        {isSearching ? "Searching…" : "Run search"}
      </button>
    </div>
  );
};
