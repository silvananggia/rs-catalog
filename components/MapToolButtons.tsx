"use client";

import type { BboxDrawVisual, MapTool } from "@/components/Map";
import {
  IconBoxDrag,
  IconClearAoi,
  IconLineCorners,
  IconRuler,
} from "@/components/map-tool-icons";

export interface MapToolButtonsProps {
  activeTool: MapTool;
  onActiveToolChange: (t: MapTool) => void;
  bboxDrawVisual: BboxDrawVisual;
  onBboxDrawVisualChange: (v: BboxDrawVisual) => void;
  onClearBbox: () => void;
}

const rowBase =
  "flex w-full min-w-[12.5rem] max-w-[15rem] items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left shadow-catalog transition focus:outline-none focus:ring-2 focus:ring-catalog-accent/40 sm:min-w-[14rem]";

const inactive = `${rowBase} border-catalog-border bg-white/95 text-catalog-ink hover:bg-catalog-raised hover:shadow-catalog-lg`;
const activeBox = `${rowBase} border-catalog-accent bg-catalog-accent-muted/90 ring-1 ring-catalog-accent/40 shadow-catalog-lg`;
const activeRuler = `${rowBase} border-emerald-600/45 bg-emerald-50 ring-1 ring-emerald-500/25 shadow-catalog-lg`;

function ToolLabel({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block text-xs font-semibold leading-tight text-catalog-ink">
        {title}
      </span>
      <span className="mt-0.5 block text-[10px] leading-snug text-catalog-muted">
        {subtitle}
      </span>
    </span>
  );
}

export function MapToolButtons({
  activeTool,
  onActiveToolChange,
  bboxDrawVisual,
  onBboxDrawVisualChange,
  onClearBbox,
}: MapToolButtonsProps) {
  return (
    <div className="pointer-events-auto flex flex-col items-end gap-1.5">
      <button
        type="button"
        title="Box — drag: draw a search rectangle on the map"
        className={activeTool === "bbox-drag" ? activeBox : inactive}
        aria-pressed={activeTool === "bbox-drag"}
        onClick={() =>
          onActiveToolChange(activeTool === "bbox-drag" ? "none" : "bbox-drag")
        }
      >
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${
            activeTool === "bbox-drag"
              ? "border-catalog-accent bg-catalog-accent text-white"
              : "border-catalog-border bg-catalog-raised text-catalog-muted"
          }`}
        >
          <IconBoxDrag className="h-5 w-5" />
        </span>
        <ToolLabel
          title="Box — drag"
          subtitle="Drag rectangle on the map"
        />
      </button>

      {activeTool === "bbox-drag" && (
        <div className="mb-0.5 flex w-full min-w-[12.5rem] max-w-[15rem] gap-1 rounded-lg border border-catalog-border bg-catalog-canvas/80 p-1 shadow-inner sm:min-w-[14rem]">
          <button
            type="button"
            title="Filled box"
            className={`flex-1 rounded px-2 py-1.5 text-[10px] font-semibold ${
              bboxDrawVisual === "fill"
                ? "bg-catalog-accent text-white"
                : "text-catalog-muted hover:bg-white"
            }`}
            onClick={() => onBboxDrawVisualChange("fill")}
          >
            Fill
          </button>
          <button
            type="button"
            title="Line outline only"
            className={`flex-1 rounded px-2 py-1.5 text-[10px] font-semibold ${
              bboxDrawVisual === "outline"
                ? "bg-catalog-accent text-white"
                : "text-catalog-muted hover:bg-white"
            }`}
            onClick={() => onBboxDrawVisualChange("outline")}
          >
            Outline
          </button>
        </div>
      )}

      <button
        type="button"
        title="Two clicks for opposite corners of the AOI"
        className={activeTool === "bbox-corners" ? activeBox : inactive}
        aria-pressed={activeTool === "bbox-corners"}
        onClick={() =>
          onActiveToolChange(
            activeTool === "bbox-corners" ? "none" : "bbox-corners"
          )
        }
      >
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${
            activeTool === "bbox-corners"
              ? "border-catalog-accent bg-catalog-accent text-white"
              : "border-catalog-border bg-catalog-raised text-catalog-muted"
          }`}
        >
          <IconLineCorners className="h-5 w-5" />
        </span>
        <ToolLabel
          title="Line — 2 clicks"
          subtitle="First corner, then diagonal"
        />
      </button>

      <button
        type="button"
        title="Ruler: measure distance on the map"
        className={activeTool === "ruler" ? activeRuler : inactive}
        aria-pressed={activeTool === "ruler"}
        onClick={() =>
          onActiveToolChange(activeTool === "ruler" ? "none" : "ruler")
        }
      >
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${
            activeTool === "ruler"
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-catalog-border bg-catalog-raised text-catalog-muted"
          }`}
        >
          <IconRuler className="h-5 w-5" />
        </span>
        <ToolLabel title="Ruler" subtitle="Draw line to read length" />
      </button>

      <button
        type="button"
        title="Clear AOI and stop tools"
        className={`${inactive} hover:border-rose-300 hover:bg-rose-50 hover:text-rose-900`}
        onClick={() => {
          onClearBbox();
          onActiveToolChange("none");
        }}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-catalog-border bg-catalog-raised text-catalog-muted hover:border-rose-300 hover:bg-rose-100 hover:text-rose-800">
          <IconClearAoi className="h-5 w-5" />
        </span>
        <ToolLabel title="Clear AOI" subtitle="Reset extent & tools" />
      </button>
    </div>
  );
}
