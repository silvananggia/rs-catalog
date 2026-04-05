import { NextResponse } from "next/server";
import { resolveStacSearchUrl } from "@/lib/catalog-settings";
import { getMergedCatalogSettings } from "@/lib/catalog-settings-server";
import { requireAdmin } from "@/lib/admin-api";
import { getCatalogSettingsRow, upsertCatalogSettings } from "@/lib/directus";
import type { CatalogSettingsRecord } from "@/lib/types";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const row = await getCatalogSettingsRow();
    const merged = await getMergedCatalogSettings();
    return NextResponse.json({
      row,
      merged,
      stacSearchUrl: resolveStacSearchUrl(merged),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load settings";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: Partial<
    Pick<
      CatalogSettingsRecord,
      | "enabled_collection_ids"
      | "stac_search_url"
      | "default_cloud_cover"
      | "default_search_limit"
      | "bulk_ingest_max_items"
      | "date_range_days_default"
    >
  >;
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch: Partial<Omit<CatalogSettingsRecord, "id">> = {};
  if (body.enabled_collection_ids !== undefined) {
    patch.enabled_collection_ids = body.enabled_collection_ids;
  }
  if (body.stac_search_url !== undefined) {
    patch.stac_search_url = body.stac_search_url || null;
  }
  if (body.default_cloud_cover !== undefined) {
    patch.default_cloud_cover = body.default_cloud_cover;
  }
  if (body.default_search_limit !== undefined) {
    patch.default_search_limit = body.default_search_limit;
  }
  if (body.bulk_ingest_max_items !== undefined) {
    patch.bulk_ingest_max_items = body.bulk_ingest_max_items;
  }
  if (body.date_range_days_default !== undefined) {
    patch.date_range_days_default = body.date_range_days_default;
  }

  try {
    const row = await upsertCatalogSettings(patch);
    const merged = await getMergedCatalogSettings();
    return NextResponse.json({
      row,
      merged,
      stacSearchUrl: resolveStacSearchUrl(merged),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Save failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
