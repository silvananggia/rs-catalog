"use client";

import { useEffect, useMemo, useState } from "react";
import type { STACSearchParams } from "@/lib/types";
import type { BBoxTuple } from "@/lib/types";

export const STAC_COLLECTION_IDS: Record<string, string> = {
  "sentinel-2": "sentinel-2-l2a",
  landsat: "landsat-c2-l2",
  worldview: "worldview",
  pleiades: "pleiades",
};

export interface SearchPanelProps {
  bbox: BBoxTuple | null;
  onBboxManualChange: (bbox: BBoxTuple) => void;
  onSearch: (params: STACSearchParams) => void;
  drawMode: boolean;
  onToggleDrawMode: () => void;
  isSearching: boolean;
}

export const SearchPanel = ({
  bbox,
  onBboxManualChange,
  onSearch,
  drawMode,
  onToggleDrawMode,
  isSearching,
}: SearchPanelProps) => {
  const [west, setWest] = useState("-10");
  const [south, setSouth] = useState("35");
  const [east, setEast] = useState("10");
  const [north, setNorth] = useState("55");
  const [startDate, setStartDate] = useState("2024-01-01");
  const [endDate, setEndDate] = useState("2024-06-01");
  const [cloud, setCloud] = useState(30);
  const [collections, setCollections] = useState<string[]>([
    "sentinel-2-l2a",
    "landsat-c2-l2",
  ]);

  const params = useMemo((): STACSearchParams => {
    const datetime = `${startDate}T00:00:00Z/${endDate}T23:59:59Z`;
    const bb: BBoxTuple = bbox
      ? bbox
      : [
          parseFloat(west) || 0,
          parseFloat(south) || 0,
          parseFloat(east) || 0,
          parseFloat(north) || 0,
        ];
    return {
      bbox: bb,
      datetime,
      cloudCover: cloud,
      collections,
      limit: 50,
    };
  }, [bbox, west, south, east, north, startDate, endDate, cloud, collections]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      onSearch(params);
    }, 500);
    return () => window.clearTimeout(t);
  }, [params, onSearch]);

  const toggleCollection = (stacId: string) => {
    setCollections((c) =>
      c.includes(stacId) ? c.filter((x) => x !== stacId) : [...c, stacId]
    );
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-700/80 bg-slate-900/80 p-4 text-slate-100 shadow-lg backdrop-blur">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        Search STAC
      </h2>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <label className="col-span-2 text-slate-500">
          Bounding box (W/S/E/N)
        </label>
        <input
          className="rounded border border-slate-600 bg-slate-950 px-2 py-1"
          value={west}
          onChange={(e) => setWest(e.target.value)}
          placeholder="west"
        />
        <input
          className="rounded border border-slate-600 bg-slate-950 px-2 py-1"
          value={south}
          onChange={(e) => setSouth(e.target.value)}
          placeholder="south"
        />
        <input
          className="rounded border border-slate-600 bg-slate-950 px-2 py-1"
          value={east}
          onChange={(e) => setEast(e.target.value)}
          placeholder="east"
        />
        <input
          className="rounded border border-slate-600 bg-slate-950 px-2 py-1"
          value={north}
          onChange={(e) => setNorth(e.target.value)}
          placeholder="north"
        />
        <button
          type="button"
          className={`col-span-2 rounded px-3 py-2 text-xs font-medium ${
            drawMode
              ? "bg-amber-600 text-white"
              : "bg-slate-700 text-slate-200 hover:bg-slate-600"
          }`}
          onClick={onToggleDrawMode}
        >
          {drawMode ? "Drawing… (drag on map)" : "Draw bbox on map"}
        </button>
        <button
          type="button"
          className="col-span-2 rounded bg-slate-800 px-3 py-1 text-xs text-slate-400 hover:bg-slate-700"
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
          Apply manual bbox to map
        </button>
      </div>

      <div className="flex flex-col gap-1 text-xs">
        <span className="text-slate-500">Date range</span>
        <div className="flex gap-2">
          <input
            type="date"
            className="flex-1 rounded border border-slate-600 bg-slate-950 px-2 py-1"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <input
            type="date"
            className="flex-1 rounded border border-slate-600 bg-slate-950 px-2 py-1"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1 text-xs">
        <span className="text-slate-500">Max cloud cover: {cloud}%</span>
        <input
          type="range"
          min={0}
          max={100}
          value={cloud}
          onChange={(e) => setCloud(Number(e.target.value))}
          className="w-full accent-sky-500"
        />
      </div>

      <div className="flex flex-col gap-2 text-xs">
        <span className="text-slate-500">Collections</span>
        {Object.entries(STAC_COLLECTION_IDS).map(([label, stacId]) => (
          <label
            key={stacId}
            className="flex cursor-pointer items-center gap-2 text-slate-300"
          >
            <input
              type="checkbox"
              checked={collections.includes(stacId)}
              onChange={() => toggleCollection(stacId)}
              className="rounded border-slate-500"
            />
            {label}
          </label>
        ))}
      </div>

      <button
        type="button"
        disabled={isSearching}
        className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
        onClick={() => onSearch(params)}
      >
        {isSearching ? "Searching…" : "Search now"}
      </button>
    </div>
  );
};
