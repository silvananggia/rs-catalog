import type { Feature, Polygon } from "geojson";

export type Role = "admin" | "analyst" | "viewer";

export type SceneCollection =
  | "sentinel-2"
  | "landsat"
  | "worldview"
  | "pleiades";

export type JobStatus = "queued" | "running" | "done" | "failed";

/** BBox as [minX, minY, maxX, maxY] in WGS84 */
export type BBoxTuple = [number, number, number, number];

export interface NormalizedScene {
  id?: string;
  scene_id: string;
  collection: SceneCollection;
  datetime: string;
  cloud_cover: number;
  bbox: BBoxTuple;
  footprint: Feature<Polygon>;
  thumbnail_url: string | null;
  assets: Record<string, unknown> | null;
  provider: string;
  resolution: number;
  is_high_resolution: boolean;
  created_by?: string | null;
}

export interface IngestionJob {
  id: string;
  status: JobStatus;
  query_params: STACSearchParams;
  result_count: number;
  created_at: string;
  /** Present when jobs are scoped per user (analyst) */
  created_by?: string | null;
}

export interface SavedScene {
  id: string;
  user_id: string;
  scene_id: string;
}

export interface DirectusUser {
  id: string;
  role: Role;
  email: string;
}

/** Raw STAC Item (Earth Search / STAC 1.0 subset) */
export interface STACItem {
  type: "Feature";
  stac_version?: string;
  id: string;
  collection?: string;
  bbox: [number, number, number, number];
  geometry: {
    type: string;
    coordinates: number[][][] | number[][][][];
  };
  properties: {
    datetime?: string;
    created?: string;
    updated?: string;
    "eo:cloud_cover"?: number;
    "proj:epsg"?: number;
    platform?: string;
    instruments?: string[];
    title?: string;
    [key: string]: unknown;
  };
  assets: Record<
    string,
    {
      href: string;
      type?: string;
      title?: string;
      roles?: string[];
      [key: string]: unknown;
    }
  >;
  links?: Array<{ rel: string; href: string; [key: string]: unknown }>;
}

export interface STACSearchParams {
  bbox?: BBoxTuple;
  datetime?: string;
  cloudCover?: number;
  collections?: string[];
  limit?: number;
  page?: number;
}

export interface IngestRequestBody {
  query: STACSearchParams;
  mode: "single" | "bulk";
}

/** Singleton row in Directus `catalog_settings` */
export interface CatalogSettingsRecord {
  id: string;
  enabled_collection_ids?: string[] | null;
  stac_search_url?: string | null;
  default_cloud_cover?: number | null;
  default_search_limit?: number | null;
  bulk_ingest_max_items?: number | null;
  date_range_days_default?: number | null;
}

export interface DirectusRoleRow {
  id: string;
  name: string;
}

export interface DirectusUserListRow {
  id: string;
  email: string;
  status: string;
  role: { id: string; name: string } | null;
}

export interface IngestResponseBody {
  jobId: string;
  inserted: number;
  skipped: number;
  status: JobStatus;
}
