"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Feature, FeatureCollection, Polygon } from "geojson";
import type { NormalizedScene } from "@/lib/types";
import type { BBoxTuple } from "@/lib/types";

const SOURCE_ID = "scenes-footprints";
const FILL_LAYER = "scenes-fill";
const LINE_LAYER = "scenes-line";
const BBOX_SOURCE = "bbox-rect";
const BBOX_LAYER = "bbox-fill";

export interface MapProps {
  scenes: NormalizedScene[];
  selectedSceneId?: string | null;
  onSelectScene: (sceneId: string) => void;
  bboxDrawMode: boolean;
  onBboxComplete: (bbox: BBoxTuple) => void;
  onMapReady?: (map: maplibregl.Map) => void;
}

function scenesToFeatureCollection(
  scenes: NormalizedScene[],
  selectedSceneId: string | null
): FeatureCollection {
  const features: Feature<Polygon>[] = scenes.map((s) => ({
    type: "Feature",
    id: s.scene_id,
    properties: {
      scene_id: s.scene_id,
      selected: s.scene_id === selectedSceneId ? 1 : 0,
    },
    geometry: s.footprint.geometry,
  }));
  return { type: "FeatureCollection", features };
}

const MapComponent = ({
  scenes,
  selectedSceneId = null,
  onSelectScene,
  bboxDrawMode,
  onBboxComplete,
  onMapReady,
}: MapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const scenesRef = useRef(scenes);
  scenesRef.current = scenes;
  const [loaded, setLoaded] = useState(false);
  const drawRef = useRef<{
    start: maplibregl.LngLat | null;
    current: maplibregl.LngLat | null;
  }>({ start: null, current: null });

  const key = process.env.NEXT_PUBLIC_MAPTILER_KEY ?? "";

  const fc = useMemo(
    () => scenesToFeatureCollection(scenes, selectedSceneId),
    [scenes, selectedSceneId]
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const styleUrl = key
      ? `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${key}`
      : {
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: [
                "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
              ],
              tileSize: 256,
              attribution: "© OpenStreetMap",
            },
          },
          layers: [
            {
              id: "bg",
              type: "raster",
              source: "osm",
            },
          ],
        };

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleUrl as maplibregl.StyleSpecification,
      center: [0, 20],
      zoom: 1.4,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.on("load", () => {
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: fc,
        promoteId: "scene_id",
      });
      map.addLayer({
        id: FILL_LAYER,
        type: "fill",
        source: SOURCE_ID,
        paint: {
          "fill-color": [
            "case",
            ["==", ["get", "selected"], 1],
            "#38bdf8",
            "#6366f1",
          ],
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            0.55,
            0.35,
          ],
        },
      });
      map.addLayer({
        id: LINE_LAYER,
        type: "line",
        source: SOURCE_ID,
        paint: {
          "line-color": "#a5b4fc",
          "line-width": 1,
        },
      });

      map.addSource(BBOX_SOURCE, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: BBOX_LAYER,
        type: "fill",
        source: BBOX_SOURCE,
        paint: {
          "fill-color": "#fbbf24",
          "fill-opacity": 0.15,
        },
      });

      map.on("click", FILL_LAYER, (e) => {
        const f = e.features?.[0];
        const sid = f?.properties?.scene_id;
        if (typeof sid === "string") {
          onSelectScene(sid);
          const scene = scenesRef.current.find((s) => s.scene_id === sid);
          if (scene) {
            const [w, s, e, n] = scene.bbox;
            map.fitBounds(
              [
                [w, s],
                [e, n],
              ],
              { padding: 48, duration: 900 }
            );
          }
        }
      });

      let hoveredId: string | null = null;
      map.on("mousemove", FILL_LAYER, (e) => {
        if (e.features?.length) {
          map.getCanvas().style.cursor = "pointer";
          const id = e.features[0].properties?.scene_id;
          if (typeof id === "string" && hoveredId !== id) {
            if (hoveredId) {
              map.setFeatureState(
                { source: SOURCE_ID, id: hoveredId },
                { hover: false }
              );
            }
            hoveredId = id;
            map.setFeatureState({ source: SOURCE_ID, id }, { hover: true });
          }
        }
      });
      map.on("mouseleave", FILL_LAYER, () => {
        map.getCanvas().style.cursor = "";
        if (hoveredId) {
          map.setFeatureState(
            { source: SOURCE_ID, id: hoveredId },
            { hover: false }
          );
          hoveredId = null;
        }
      });

      mapRef.current = map;
      setLoaded(true);
      onMapReady?.(map);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    const src = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (src) {
      src.setData(fc);
    }
  }, [fc, loaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;

    const onDown = (e: maplibregl.MapMouseEvent) => {
      if (!bboxDrawMode) return;
      drawRef.current.start = e.lngLat;
      drawRef.current.current = e.lngLat;
    };
    const onMove = (e: maplibregl.MapMouseEvent) => {
      if (!bboxDrawMode || !drawRef.current.start) return;
      drawRef.current.current = e.lngLat;
      const a = drawRef.current.start;
      const b = e.lngLat;
      const poly: Feature<Polygon> = {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [a.lng, a.lat],
              [b.lng, a.lat],
              [b.lng, b.lat],
              [a.lng, b.lat],
              [a.lng, a.lat],
            ],
          ],
        },
      };
      const src = map.getSource(BBOX_SOURCE) as maplibregl.GeoJSONSource;
      src.setData({ type: "FeatureCollection", features: [poly] });
    };
    const onUp = () => {
      if (!bboxDrawMode || !drawRef.current.start || !drawRef.current.current)
        return;
      const a = drawRef.current.start;
      const b = drawRef.current.current;
      const west = Math.min(a.lng, b.lng);
      const east = Math.max(a.lng, b.lng);
      const south = Math.min(a.lat, b.lat);
      const north = Math.max(a.lat, b.lat);
      drawRef.current.start = null;
      drawRef.current.current = null;
      onBboxComplete([west, south, east, north]);
    };

    map.on("mousedown", onDown);
    map.on("mousemove", onMove);
    map.on("mouseup", onUp);

    return () => {
      map.off("mousedown", onDown);
      map.off("mousemove", onMove);
      map.off("mouseup", onUp);
    };
  }, [bboxDrawMode, loaded, onBboxComplete]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    map.getCanvas().style.cursor = bboxDrawMode ? "crosshair" : "";
  }, [bboxDrawMode, loaded]);

  return (
    <div className="relative h-full min-h-[320px] w-full overflow-hidden rounded-xl border border-slate-700/80 bg-slate-950 shadow-inner">
      <div ref={containerRef} className="absolute inset-0" />
      {!loaded && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/80 text-sm text-slate-400">
          Loading map…
        </div>
      )}
    </div>
  );
};

export { MapComponent as Map };
