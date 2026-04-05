import type { Feature, Polygon, Position } from "geojson";
import type {
  NormalizedScene,
  STACItem,
  STACSearchParams,
  SceneCollection,
} from "./types";

const STAC_SEARCH_URL =
  "https://earth-search.aws.element84.com/v1/search";

const COLLECTION_MAP: Record<string, SceneCollection> = {
  "sentinel-2-l2a": "sentinel-2",
  "sentinel-2-l1c": "sentinel-2",
  "landsat-c2-l2": "landsat",
  "landsat-c2-l1": "landsat",
  worldview: "worldview",
  pleiades: "pleiades",
};

function mapCollection(raw: string | undefined): SceneCollection {
  if (!raw) return "sentinel-2";
  const lower = raw.toLowerCase();
  if (lower in COLLECTION_MAP) {
    return COLLECTION_MAP[lower] as SceneCollection;
  }
  if (lower.includes("sentinel")) return "sentinel-2";
  if (lower.includes("landsat")) return "landsat";
  if (lower.includes("worldview")) return "worldview";
  if (lower.includes("pleiades")) return "pleiades";
  return "sentinel-2";
}

function ensurePolygonFootprint(item: STACItem): Feature<Polygon> {
  const g = item.geometry;
  if (g.type === "Polygon") {
    return {
      type: "Feature",
      properties: {},
      geometry: g as Polygon,
    };
  }
  if (g.type === "MultiPolygon" && Array.isArray(g.coordinates?.[0]?.[0])) {
    const coords = g.coordinates as number[][][][];
    const first = coords[0];
    if (first) {
      return {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: first as Position[][],
        },
      };
    }
  }
  const [w, s, e, n] = item.bbox;
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [w, s],
          [e, s],
          [e, n],
          [w, n],
          [w, s],
        ],
      ],
    },
  };
}

function estimateResolutionMeters(item: STACItem): number {
  const col = (item.collection ?? "").toLowerCase();
  if (col.includes("sentinel")) return 10;
  if (col.includes("landsat")) return 30;
  if (col.includes("worldview") || col.includes("pleiades")) return 0.5;
  return 10;
}

function isHighResolutionCollection(col: SceneCollection): boolean {
  return col === "worldview" || col === "pleiades";
}

function pickThumbnail(item: STACItem): string | null {
  const assets = item.assets ?? {};
  const thumb =
    assets.thumbnail?.href ??
    assets.rendered_preview?.href ??
    assets.preview?.href ??
    null;
  return thumb;
}

function simplifyAssets(item: STACItem): Record<string, unknown> | null {
  const assets = item.assets ?? {};
  if (Object.keys(assets).length === 0) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(assets)) {
    out[k] = {
      href: v.href,
      type: v.type,
      roles: v.roles,
    };
  }
  return out;
}

export function normalizeSTACItem(item: STACItem): NormalizedScene {
  const collection = mapCollection(item.collection);
  const dt =
    item.properties.datetime ??
    item.properties.created ??
    new Date().toISOString();
  const cloud =
    typeof item.properties["eo:cloud_cover"] === "number"
      ? item.properties["eo:cloud_cover"]
      : 0;

  const hr = isHighResolutionCollection(collection);

  return {
    scene_id: item.id,
    collection,
    datetime: dt,
    cloud_cover: cloud,
    bbox: [...item.bbox] as [number, number, number, number],
    footprint: ensurePolygonFootprint(item),
    thumbnail_url: pickThumbnail(item),
    assets: hr ? null : simplifyAssets(item),
    provider: item.properties.platform ?? "stac",
    resolution: estimateResolutionMeters(item),
    is_high_resolution: hr,
  };
}

function buildStacBody(params: STACSearchParams): Record<string, unknown> {
  const limit = params.limit ?? 20;
  const body: Record<string, unknown> = {
    limit,
    ...(params.collections?.length
      ? { collections: params.collections }
      : {}),
  };

  if (params.bbox) {
    body.bbox = params.bbox;
  }

  if (params.datetime) {
    body.datetime = params.datetime;
  }

  /**
   * Cloud cover: STAC Item Search `query` extension (eo:cloud_cover lte).
   * Earth Search / pgstac applies this reliably; a bare CQL2 `filter` object
   * without `filter-lang` is often ignored by the API.
   */
  if (typeof params.cloudCover === "number") {
    body.query = {
      "eo:cloud_cover": {
        lte: params.cloudCover,
      },
    };
  }

  return body;
}

async function postStacSearch(
  url: string,
  body: Record<string, unknown>
): Promise<{ features: STACItem[]; links?: Array<{ rel: string; href: string }> }> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/geo+json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`STAC search failed: ${res.status} ${t}`);
  }
  return res.json() as Promise<{
    features: STACItem[];
    links?: Array<{ rel: string; href: string }>;
  }>;
}

export async function searchSTAC(
  params: STACSearchParams
): Promise<NormalizedScene[]> {
  const body = buildStacBody(params);
  const json = await postStacSearch(STAC_SEARCH_URL, body);
  return json.features.map(normalizeSTACItem);
}

export async function searchSTACPaginated(
  params: STACSearchParams,
  maxItems: number
): Promise<NormalizedScene[]> {
  const pageSize = Math.min(params.limit ?? 50, 100);
  const firstBody = buildStacBody({ ...params, limit: pageSize });
  let page = await postStacSearch(STAC_SEARCH_URL, firstBody);
  const out: NormalizedScene[] = page.features.map(normalizeSTACItem);

  while (out.length < maxItems) {
    const nextUrl = page.links?.find((l) => l.rel === "next")?.href;
    if (!nextUrl) break;
    page = await postStacSearch(nextUrl, firstBody);
    if (!page.features?.length) break;
    out.push(...page.features.map(normalizeSTACItem));
    if (page.features.length < pageSize) break;
    if (out.length > maxItems * 2) break;
  }

  return out.slice(0, maxItems);
}
