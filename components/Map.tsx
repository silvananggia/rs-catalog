"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import OlMap from "ol/Map";
import View from "ol/View";
import BaseLayer from "ol/layer/Base";
import ImageLayer from "ol/layer/Image";
import TileLayer from "ol/layer/Tile";
import type TileSource from "ol/source/Tile";
import ImageStatic from "ol/source/ImageStatic";
import XYZ from "ol/source/XYZ";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import { fromLonLat, transformExtent } from "ol/proj";
import { defaults as defaultControls } from "ol/control";
import ScaleLine from "ol/control/ScaleLine";
import DragBox from "ol/interaction/DragBox";
import Draw from "ol/interaction/Draw";
import DoubleClickZoom from "ol/interaction/DoubleClickZoom";
import Feature from "ol/Feature";
import type { FeatureLike } from "ol/Feature";
import type { Geometry } from "ol/geom";
import LineString from "ol/geom/LineString";
import { fromExtent } from "ol/geom/Polygon";
import { getLength } from "ol/sphere";
import { unByKey } from "ol/Observable";
import type { Coordinate } from "ol/coordinate";
import Style from "ol/style/Style";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import CircleStyle from "ol/style/Circle";
import type {
  FeatureCollection,
  Feature as GeoJSONFeature,
  Polygon,
} from "geojson";
import type { NormalizedScene } from "@/lib/types";
import type { BBoxTuple } from "@/lib/types";
import {
  createBasemapTileLayer,
  type BasemapId,
} from "@/lib/map-basemaps";
import "ol/ol.css";

export type { BasemapId };
export type MapTool = "none" | "bbox-drag" | "bbox-corners" | "ruler";
export type BboxDrawVisual = "fill" | "outline";

/** Scene preview: TiTiler XYZ tiles preferred, else static `imageUrl` on bbox */
export interface MapVisualizationTarget {
  sceneId: string;
  bbox: BBoxTuple;
  /** OpenLayers XYZ template from TiTiler `/cog/tiles/...` */
  titilerXyzUrl: string | null;
  /** Fallback: thumbnail stretched to bbox */
  imageUrl: string | null;
}

const geojsonFormat = new GeoJSON({
  dataProjection: "EPSG:4326",
  featureProjection: "EPSG:3857",
});

export interface MapProps {
  scenes: NormalizedScene[];
  selectedSceneId?: string | null;
  onSelectScene: (sceneId: string) => void;
  basemap: BasemapId;
  activeTool: MapTool;
  /** Style while dragging a rectangle bbox */
  bboxDrawVisual: BboxDrawVisual;
  /** Current search bbox shown on map (WGS84) */
  bboxExtent: BBoxTuple | null;
  onBboxComplete: (bbox: BBoxTuple) => void;
  onMapReady?: (map: OlMap) => void;
  /** TiTiler COG tiles or static thumbnail over scene extent */
  visualizeTarget?: MapVisualizationTarget | null;
  onClearVisualization?: () => void;
}

function scenesToFeatureCollection(
  scenes: NormalizedScene[],
  selectedSceneId: string | null
): FeatureCollection {
  const features: GeoJSONFeature<Polygon>[] = scenes.map((s) => ({
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

const bboxOverlayStyle = new Style({
  stroke: new Stroke({ color: "#2563eb", width: 2, lineDash: [8, 6] }),
  fill: new Fill({ color: "rgba(37, 99, 235, 0.1)" }),
});

const previewLineStyle = new Style({
  stroke: new Stroke({ color: "#3b82f6", width: 2, lineDash: [4, 4] }),
});
const previewPolyStyle = new Style({
  stroke: new Stroke({ color: "#2563eb", width: 2 }),
  fill: new Fill({ color: "rgba(37, 99, 235, 0.12)" }),
});

const measureStyle = new Style({
  stroke: new Stroke({ color: "#059669", width: 2 }),
});

const MapComponent = ({
  scenes,
  selectedSceneId = null,
  onSelectScene,
  basemap,
  activeTool,
  bboxDrawVisual,
  bboxExtent,
  onBboxComplete,
  onMapReady,
  visualizeTarget = null,
  onClearVisualization,
}: MapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<OlMap | null>(null);
  const scenesLayerRef = useRef<VectorLayer<Feature<Geometry>> | null>(null);
  const basemapLayersRef = useRef<Record<
    BasemapId,
    TileLayer<TileSource>
  > | null>(null);
  const bboxOverlaySourceRef = useRef<VectorSource | null>(null);
  const cornerPreviewSourceRef = useRef<VectorSource | null>(null);
  const measureSourceRef = useRef<VectorSource | null>(null);
  const previewOverlayLayerRef = useRef<BaseLayer | null>(null);
  const lastVisualizedSceneIdRef = useRef<string | null>(null);
  /** Scene with active map preview (TiTiler / thumbnail) — highlighted footprint */
  const visualizedSceneIdRef = useRef<string | null>(null);
  visualizedSceneIdRef.current = visualizeTarget?.sceneId ?? null;
  const scenesRef = useRef(scenes);
  scenesRef.current = scenes;
  const hoveredSceneIdRef = useRef<string | null>(null);
  const activeToolRef = useRef(activeTool);
  activeToolRef.current = activeTool;
  const [loaded, setLoaded] = useState(false);
  const [measureLabel, setMeasureLabel] = useState<string | null>(null);

  const fc = useMemo(
    () => scenesToFeatureCollection(scenes, selectedSceneId),
    [scenes, selectedSceneId]
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const basemapLayers: Record<BasemapId, TileLayer<TileSource>> = {
      "carto-dark": createBasemapTileLayer("carto-dark"),
      osm: createBasemapTileLayer("osm"),
      satellite: createBasemapTileLayer("satellite"),
    };
    basemapLayersRef.current = basemapLayers;
    Object.values(basemapLayers).forEach((l) => l.setVisible(false));
    basemapLayers[basemap].setVisible(true);

    const scenesSource = new VectorSource();
    const sceneStyle = (feature: FeatureLike) => {
      const sid = feature.get("scene_id") as string | undefined;
      const isViz =
        sid != null && visualizedSceneIdRef.current === sid;
      const selected = feature.get("selected") === 1;
      const hover = sid != null && hoveredSceneIdRef.current === sid;

      if (isViz) {
        return [
          new Style({
            stroke: new Stroke({
              color: "rgba(37, 99, 235, 0.35)",
              width: 4,
              lineCap: "round",
              lineJoin: "round",
            }),
            zIndex: 0,
          }),
          new Style({
            fill: new Fill({ color: "rgba(37, 99, 235, 0.14)" }),
            stroke: new Stroke({
              color: "#2563eb",
              width: 2,
              lineDash: [6, 4],
            }),
            zIndex: 1,
          }),
        ];
      }

      const fillColor = selected
        ? "rgba(37, 99, 235, 0.32)"
        : hover
          ? "rgba(37, 99, 235, 0.22)"
          : "rgba(37, 99, 235, 0.14)";
      return new Style({
        fill: new Fill({ color: fillColor }),
        stroke: new Stroke({ color: "#1d4ed8", width: selected ? 2 : 1 }),
      });
    };

    const scenesLayer = new VectorLayer<Feature<Geometry>>({
      source: scenesSource,
      style: sceneStyle,
      zIndex: 2,
    });
    scenesLayerRef.current = scenesLayer;

    const bboxOverlaySource = new VectorSource();
    bboxOverlaySourceRef.current = bboxOverlaySource;
    const bboxOverlayLayer = new VectorLayer({
      source: bboxOverlaySource,
      style: bboxOverlayStyle,
      zIndex: 1,
    });

    const cornerPreviewSource = new VectorSource();
    cornerPreviewSourceRef.current = cornerPreviewSource;
    const cornerPreviewLayer = new VectorLayer({
      source: cornerPreviewSource,
      zIndex: 3,
    });

    const measureSource = new VectorSource();
    measureSourceRef.current = measureSource;
    const measureLayer = new VectorLayer({
      source: measureSource,
      style: measureStyle,
      zIndex: 4,
    });

    const map = new OlMap({
      target: containerRef.current,
      layers: [
        basemapLayers["carto-dark"],
        basemapLayers.osm,
        basemapLayers.satellite,
        bboxOverlayLayer,
        scenesLayer,
        cornerPreviewLayer,
        measureLayer,
      ],
      view: new View({
        center: fromLonLat([118, -2]),
        zoom: 5,
      }),
      controls: defaultControls({ attribution: true, rotate: false }).extend([
        new ScaleLine({ units: "metric" }),
      ]),
    });

    map.on("singleclick", (evt) => {
      if (activeToolRef.current !== "none") return;
      map.forEachFeatureAtPixel(evt.pixel, (feature, layer) => {
        if (layer !== scenesLayer) return undefined;
        const sid = feature.get("scene_id");
        if (typeof sid !== "string") return undefined;
        onSelectScene(sid);
        const scene = scenesRef.current.find((s) => s.scene_id === sid);
        if (scene) {
          const [w, s, e, n] = scene.bbox;
          const extent = transformExtent(
            [w, s, e, n],
            "EPSG:4326",
            "EPSG:3857"
          );
          map.getView().fit(extent, {
            padding: [48, 48, 48, 48],
            duration: 900,
            maxZoom: 14,
          });
        }
        return true;
      });
    });

    let lastHover: string | null = null;
    map.on("pointermove", (evt) => {
      if (activeToolRef.current !== "none") {
        map.getViewport().style.cursor = "crosshair";
        return;
      }
      let hit: FeatureLike | undefined;
      map.forEachFeatureAtPixel(evt.pixel, (feature, layer) => {
        if (layer === scenesLayer) {
          hit = feature;
          return true;
        }
        return undefined;
      });
      const sid =
        hit && typeof hit.get("scene_id") === "string"
          ? (hit.get("scene_id") as string)
          : null;
      if (sid !== lastHover) {
        lastHover = sid;
        hoveredSceneIdRef.current = sid;
        scenesLayer.changed();
      }
      map.getViewport().style.cursor = hit ? "pointer" : "";
    });

    mapRef.current = map;
    setLoaded(true);
    map.updateSize();
    onMapReady?.(map);

    return () => {
      map.setTarget(undefined);
      mapRef.current = null;
      scenesLayerRef.current = null;
      basemapLayersRef.current = null;
      bboxOverlaySourceRef.current = null;
      cornerPreviewSourceRef.current = null;
      measureSourceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once
  }, []);

  useEffect(() => {
    const layers = basemapLayersRef.current;
    if (!layers || !loaded) return;
    (Object.keys(layers) as BasemapId[]).forEach((id) => {
      layers[id].setVisible(id === basemap);
    });
  }, [basemap, loaded]);

  useEffect(() => {
    const el = containerRef.current;
    const map = mapRef.current;
    if (!el || !map || !loaded) return;
    const ro = new ResizeObserver(() => map.updateSize());
    ro.observe(el);
    return () => ro.disconnect();
  }, [loaded]);

  useEffect(() => {
    const src = bboxOverlaySourceRef.current;
    if (!src || !loaded) return;
    src.clear();
    if (!bboxExtent) return;
    const ext = transformExtent(
      bboxExtent,
      "EPSG:4326",
      "EPSG:3857"
    ) as [number, number, number, number];
    const poly = fromExtent(ext);
    src.addFeature(new Feature(poly));
  }, [bboxExtent, loaded]);

  useEffect(() => {
    const layer = scenesLayerRef.current;
    const src = layer?.getSource();
    if (!src || !loaded) return;
    src.clear();
    src.addFeatures(geojsonFormat.readFeatures(fc));
  }, [fc, loaded]);

  useEffect(() => {
    scenesLayerRef.current?.changed();
  }, [visualizeTarget?.sceneId, loaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;

    const existing = previewOverlayLayerRef.current;
    if (existing) {
      map.removeLayer(existing);
      previewOverlayLayerRef.current = null;
    }

    if (!visualizeTarget) {
      lastVisualizedSceneIdRef.current = null;
      return;
    }

    const [w, s, e, n] = visualizeTarget.bbox;
    const extent = transformExtent(
      [w, s, e, n],
      "EPSG:4326",
      "EPSG:3857"
    ) as [number, number, number, number];

    const shouldFit =
      lastVisualizedSceneIdRef.current !== visualizeTarget.sceneId;
    lastVisualizedSceneIdRef.current = visualizeTarget.sceneId;

    if (shouldFit) {
      map.getView().fit(extent, {
        padding: [72, 72, 72, 72],
        duration: 550,
        maxZoom: 14,
      });
    }

    if (visualizeTarget.titilerXyzUrl) {
      const layer = new TileLayer({
        extent,
        source: new XYZ({
          url: visualizeTarget.titilerXyzUrl,
          crossOrigin: "anonymous",
        }),
        opacity: 0.92,
        zIndex: 5,
      });
      map.addLayer(layer);
      previewOverlayLayerRef.current = layer;
    } else if (visualizeTarget.imageUrl) {
      const source = new ImageStatic({
        url: visualizeTarget.imageUrl,
        imageExtent: extent,
        projection: "EPSG:3857",
        crossOrigin: "anonymous",
      });
      const layer = new ImageLayer({
        source,
        opacity: 0.9,
        zIndex: 5,
      });
      map.addLayer(layer);
      previewOverlayLayerRef.current = layer;
    }

    return () => {
      const m = mapRef.current;
      const pl = previewOverlayLayerRef.current;
      if (m && pl) {
        m.removeLayer(pl);
      }
      previewOverlayLayerRef.current = null;
    };
  }, [visualizeTarget, loaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;

    const cleanups: Array<() => void> = [];
    setMeasureLabel(null);

    const cornerPreviewSource = cornerPreviewSourceRef.current;
    const measureSource = measureSourceRef.current;

    const disableDblClick = () => {
      map.getInteractions().forEach((ix) => {
        if (ix instanceof DoubleClickZoom) ix.setActive(false);
      });
    };
    const enableDblClick = () => {
      map.getInteractions().forEach((ix) => {
        if (ix instanceof DoubleClickZoom) ix.setActive(true);
      });
    };

    if (activeTool === "bbox-drag") {
      const cls =
        bboxDrawVisual === "fill"
          ? "ol-dragbox map-bbox-drag-fill"
          : "ol-dragbox map-bbox-drag-outline";
      const dragBox = new DragBox({ className: cls });
      const onBoxEnd = () => {
        const geom = dragBox.getGeometry();
        if (!geom) return;
        const extent = geom.getExtent();
        const [w, s, e, n] = transformExtent(
          extent,
          "EPSG:3857",
          "EPSG:4326"
        );
        onBboxComplete([w, s, e, n]);
      };
      dragBox.on("boxend", onBoxEnd);
      map.addInteraction(dragBox);
      map.getViewport().style.cursor = "crosshair";
      cleanups.push(() => {
        map.removeInteraction(dragBox);
        dragBox.un("boxend", onBoxEnd);
      });
    } else if (activeTool === "bbox-corners" && cornerPreviewSource) {
      disableDblClick();
      let first: Coordinate | null = null;
      let polyFeat: Feature | null = null;
      const lineFeat = new Feature(
        new LineString([
          [0, 0],
          [0, 0],
        ])
      );
      lineFeat.setStyle(previewLineStyle);

      const k1 = map.on("singleclick", (evt) => {
        const coord = evt.coordinate;
        if (!first) {
          first = coord;
          polyFeat = null;
          cornerPreviewSource.clear();
          lineFeat.setGeometry(new LineString([first, first]));
          cornerPreviewSource.addFeature(lineFeat);
        } else {
          const extent = [
            Math.min(first[0], coord[0]),
            Math.min(first[1], coord[1]),
            Math.max(first[0], coord[0]),
            Math.max(first[1], coord[1]),
          ] as [number, number, number, number];
          const [w, s, e, n] = transformExtent(
            extent,
            "EPSG:3857",
            "EPSG:4326"
          );
          onBboxComplete([w, s, e, n]);
          first = null;
          polyFeat = null;
          cornerPreviewSource.clear();
        }
      });

      const k2 = map.on("pointermove", (evt) => {
        if (!first) return;
        const geom = lineFeat.getGeometry();
        if (geom instanceof LineString) {
          geom.setCoordinates([first, evt.coordinate]);
        }
        const ex = [
          Math.min(first[0], evt.coordinate[0]),
          Math.min(first[1], evt.coordinate[1]),
          Math.max(first[0], evt.coordinate[0]),
          Math.max(first[1], evt.coordinate[1]),
        ] as [number, number, number, number];
        if (!polyFeat) {
          polyFeat = new Feature(fromExtent(ex));
          polyFeat.setStyle(previewPolyStyle);
          cornerPreviewSource.addFeature(polyFeat);
        } else {
          polyFeat.setGeometry(fromExtent(ex));
        }
      });

      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape" && first) {
          first = null;
          polyFeat = null;
          cornerPreviewSource.clear();
        }
      };
      window.addEventListener("keydown", onKey);
      map.getViewport().style.cursor = "crosshair";

      cleanups.push(() => {
        unByKey(k1);
        unByKey(k2);
        window.removeEventListener("keydown", onKey);
        cornerPreviewSource.clear();
        enableDblClick();
      });
    } else if (activeTool === "ruler" && measureSource) {
      measureSource.clear();
      const draw = new Draw({
        source: measureSource,
        type: "LineString",
        style: new Style({
          stroke: new Stroke({ color: "#059669", width: 2 }),
          image: new CircleStyle({
            radius: 5,
            fill: new Fill({ color: "#059669" }),
          }),
        }),
      });
      draw.on("drawend", (evt) => {
        const g = evt.feature.getGeometry();
        if (!g) return;
        const len = getLength(g, { projection: map.getView().getProjection() });
        const km = len / 1000;
        const label =
          km >= 1
            ? `${km.toFixed(2)} km`
            : `${Math.round(len)} m`;
        setMeasureLabel(label);
      });
      map.addInteraction(draw);
      map.getViewport().style.cursor = "crosshair";
      cleanups.push(() => {
        map.removeInteraction(draw);
        measureSource.clear();
        setMeasureLabel(null);
      });
    }

    return () => {
      cleanups.forEach((fn) => fn());
      map.getViewport().style.cursor = "";
    };
  }, [activeTool, bboxDrawVisual, loaded, onBboxComplete]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-catalog-canvas">
      <div ref={containerRef} className="absolute inset-0" />
      {visualizeTarget && onClearVisualization && (
        <div className="pointer-events-auto absolute left-1/2 top-3 z-[60] -translate-x-1/2">
          <button
            type="button"
            className="rounded-md border border-catalog-border bg-catalog-panel/95 px-3 py-1.5 text-xs font-medium text-catalog-ink shadow-catalog-lg backdrop-blur hover:bg-catalog-raised"
            onClick={onClearVisualization}
          >
            Clear preview
          </button>
        </div>
      )}
      {measureLabel && (
        <div className="pointer-events-none absolute bottom-14 left-3 z-[60] rounded-lg border border-emerald-200 bg-white/95 px-3 py-2 font-mono text-sm text-emerald-800 shadow-lg">
          {measureLabel}
        </div>
      )}
      {!loaded && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-catalog-canvas/85 text-sm text-catalog-muted">
          Loading map…
        </div>
      )}
    </div>
  );
};

export { MapComponent as Map };
