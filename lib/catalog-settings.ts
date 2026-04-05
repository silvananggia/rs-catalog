import type { CatalogSettingsRecord } from "@/lib/types";

export const DEFAULT_STAC_SEARCH_URL =
  "https://earth-search.aws.element84.com/v1/search";

export interface MergedCatalogSettings {
  enabledCollectionIds: string[] | null;
  stacSearchUrl: string | null;
  defaultCloudCover: number;
  defaultSearchLimit: number;
  bulkIngestMaxItems: number;
  dateRangeDaysDefault: number;
}

const DEFAULTS: MergedCatalogSettings = {
  enabledCollectionIds: null,
  stacSearchUrl: null,
  defaultCloudCover: 30,
  defaultSearchLimit: 50,
  bulkIngestMaxItems: 2000,
  dateRangeDaysDefault: 14,
};

export function mergeCatalogSettings(
  row: CatalogSettingsRecord | null
): MergedCatalogSettings {
  if (!row) return { ...DEFAULTS };
  return {
    enabledCollectionIds:
      Array.isArray(row.enabled_collection_ids) &&
      row.enabled_collection_ids.length > 0
        ? row.enabled_collection_ids
        : null,
    stacSearchUrl: row.stac_search_url?.trim() || null,
    defaultCloudCover:
      typeof row.default_cloud_cover === "number"
        ? row.default_cloud_cover
        : DEFAULTS.defaultCloudCover,
    defaultSearchLimit:
      typeof row.default_search_limit === "number"
        ? row.default_search_limit
        : DEFAULTS.defaultSearchLimit,
    bulkIngestMaxItems:
      typeof row.bulk_ingest_max_items === "number"
        ? row.bulk_ingest_max_items
        : DEFAULTS.bulkIngestMaxItems,
    dateRangeDaysDefault:
      typeof row.date_range_days_default === "number"
        ? row.date_range_days_default
        : DEFAULTS.dateRangeDaysDefault,
  };
}

export function resolveStacSearchUrl(
  settings: MergedCatalogSettings
): string {
  if (settings.stacSearchUrl) return settings.stacSearchUrl;
  if (process.env.STAC_SEARCH_URL?.trim()) return process.env.STAC_SEARCH_URL.trim();
  if (process.env.NEXT_PUBLIC_STAC_SEARCH_URL?.trim()) {
    return process.env.NEXT_PUBLIC_STAC_SEARCH_URL.trim();
  }
  return DEFAULT_STAC_SEARCH_URL;
}
