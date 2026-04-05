"use client";

import { useEffect, useRef, useState } from "react";
import type { BasemapId } from "@/lib/map-basemaps";
import { IconLayers } from "@/components/map-tool-icons";

const OPTIONS: { id: BasemapId; label: string }[] = [
  { id: "carto-dark", label: "Carto Dark" },
  { id: "osm", label: "OpenStreetMap" },
  { id: "satellite", label: "Satellite" },
];

export interface BasemapSelectorProps {
  basemap: BasemapId;
  onBasemapChange: (id: BasemapId) => void;
}

export function BasemapSelector({
  basemap,
  onBasemapChange,
}: BasemapSelectorProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const currentLabel = OPTIONS.find((o) => o.id === basemap)?.label ?? basemap;

  return (
    <div ref={wrapRef} className="relative pointer-events-auto">
      <button
        type="button"
        className="flex h-10 items-center gap-2 rounded-lg border border-catalog-border bg-catalog-panel/95 px-2.5 shadow-catalog backdrop-blur transition hover:bg-catalog-raised hover:shadow-catalog-lg focus:outline-none focus:ring-2 focus:ring-catalog-accent/40"
        aria-expanded={open}
        aria-haspopup="listbox"
        title="Basemap layers"
        onClick={() => setOpen((v) => !v)}
      >
        <IconLayers className="h-5 w-5 shrink-0 text-catalog-ink" />
        <span className="hidden max-w-[7rem] truncate text-xs font-medium text-catalog-ink sm:inline">
          {currentLabel}
        </span>
        <span
          className={`text-[10px] text-catalog-muted transition-transform ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        >
          ▾
        </span>
      </button>

      {open && (
        <ul
          className="absolute right-0 top-full z-30 mt-1 min-w-[11rem] rounded-lg border border-catalog-border bg-catalog-panel/98 py-1 shadow-catalog-lg backdrop-blur-md"
          role="listbox"
        >
          {OPTIONS.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                role="option"
                aria-selected={basemap === o.id}
                className={`w-full px-3 py-2 text-left text-xs font-medium transition ${
                  basemap === o.id
                    ? "bg-catalog-accent text-white"
                    : "text-catalog-ink hover:bg-catalog-raised"
                }`}
                onClick={() => {
                  onBasemapChange(o.id);
                  setOpen(false);
                }}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
