import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import type TileSource from "ol/source/Tile";
import XYZ from "ol/source/XYZ";

export type BasemapId = "carto-dark" | "osm" | "satellite";

export function createBasemapTileLayer(
  id: BasemapId
): TileLayer<TileSource> {
  switch (id) {
    case "carto-dark":
      return new TileLayer({
        source: new XYZ({
          url: "https://{a-c}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
          attributions:
            '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
          maxZoom: 20,
        }),
      });
    case "osm":
      return new TileLayer({
        source: new OSM(),
      });
    case "satellite":
      return new TileLayer({
        source: new XYZ({
          url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          attributions: "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics",
          maxZoom: 19,
        }),
      });
    default:
      return createBasemapTileLayer("carto-dark");
  }
}
