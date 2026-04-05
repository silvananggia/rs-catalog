import type OlMap from "ol/Map";
import { transformExtent } from "ol/proj";
import type { BBoxTuple } from "@/lib/types";

/**
 * Current map viewport in WGS84 [west, south, east, north].
 * Returns null if the map has no size yet.
 */
export function getMapViewBBoxWgs84(map: OlMap): BBoxTuple | null {
  const size = map.getSize();
  if (!size || size[0] === 0 || size[1] === 0) return null;
  const extent = map.getView().calculateExtent(size);
  const [w, s, e, n] = transformExtent(
    extent,
    "EPSG:3857",
    "EPSG:4326"
  ) as [number, number, number, number];
  return [w, s, e, n];
}
