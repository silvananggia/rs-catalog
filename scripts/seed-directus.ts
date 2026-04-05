/**
 * Bootstrap collections/fields via Directus REST (requires DIRECTUS_ADMIN_TOKEN).
 * Run: npm run seed:directus
 */

const BASE =
  process.env.NEXT_PUBLIC_DIRECTUS_URL?.replace(/\/$/, "") ??
  "http://localhost:8055";
const TOKEN = process.env.DIRECTUS_ADMIN_TOKEN;

async function req(path: string, init?: RequestInit): Promise<Response> {
  const url = `${BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const headers: HeadersInit = {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
    ...init?.headers,
  };
  return fetch(url, { ...init, headers });
}

async function ensureCollection(
  name: string,
  meta: Record<string, unknown>
): Promise<void> {
  const res = await req("/collections", { method: "POST", body: JSON.stringify({
    collection: name,
    schema: {},
    meta,
  }) });
  if (res.ok || res.status === 409) return;
  const t = await res.text();
  throw new Error(`Collection ${name}: ${res.status} ${t}`);
}

async function ensureField(body: Record<string, unknown>): Promise<void> {
  const res = await req("/fields", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (res.ok || res.status === 409) return;
  const t = await res.text();
  throw new Error(`Field ${String(body.field)}: ${res.status} ${t}`);
}

async function main(): Promise<void> {
  if (!TOKEN) {
    console.error("Set DIRECTUS_ADMIN_TOKEN and NEXT_PUBLIC_DIRECTUS_URL");
    process.exit(1);
  }

  await ensureCollection("scenes", { icon: "satellite" });
  await ensureField({
    collection: "scenes",
    field: "scene_id",
    type: "string",
    schema: { is_unique: true, is_nullable: false },
    meta: { interface: "input", required: true },
  });
  await ensureField({
    collection: "scenes",
    field: "collection",
    type: "string",
    meta: {
      interface: "select-dropdown",
      options: {
        choices: [
          { text: "Sentinel-2", value: "sentinel-2" },
          { text: "Landsat", value: "landsat" },
          { text: "WorldView", value: "worldview" },
          { text: "Pleiades", value: "pleiades" },
        ],
      },
    },
  });
  await ensureField({
    collection: "scenes",
    field: "datetime",
    type: "timestamp",
    meta: { interface: "datetime" },
  });
  await ensureField({
    collection: "scenes",
    field: "cloud_cover",
    type: "float",
    meta: { interface: "input" },
  });
  await ensureField({
    collection: "scenes",
    field: "bbox",
    type: "json",
    meta: { interface: "input-code" },
  });
  await ensureField({
    collection: "scenes",
    field: "footprint",
    type: "json",
    meta: { interface: "input-code" },
  });
  await ensureField({
    collection: "scenes",
    field: "thumbnail_url",
    type: "string",
    meta: { interface: "input" },
  });
  await ensureField({
    collection: "scenes",
    field: "assets",
    type: "json",
    meta: { interface: "input-code" },
  });
  await ensureField({
    collection: "scenes",
    field: "provider",
    type: "string",
    meta: { interface: "input" },
  });
  await ensureField({
    collection: "scenes",
    field: "resolution",
    type: "float",
    meta: { interface: "input" },
  });
  await ensureField({
    collection: "scenes",
    field: "is_high_resolution",
    type: "boolean",
    meta: { interface: "boolean" },
  });
  await ensureField({
    collection: "scenes",
    field: "created_by",
    type: "uuid",
    meta: {
      interface: "select-dropdown-m2o",
      special: ["m2o"],
      options: {
        template: "{{email}}",
      },
    },
    schema: {
      foreign_key_table: "directus_users",
      foreign_key_column: "id",
    },
  });

  await ensureCollection("ingestion_jobs", { icon: "import_export" });
  await ensureField({
    collection: "ingestion_jobs",
    field: "status",
    type: "string",
    meta: {
      interface: "select-dropdown",
      options: {
        choices: [
          { text: "Queued", value: "queued" },
          { text: "Running", value: "running" },
          { text: "Done", value: "done" },
          { text: "Failed", value: "failed" },
        ],
      },
    },
  });
  await ensureField({
    collection: "ingestion_jobs",
    field: "query_params",
    type: "json",
    meta: { interface: "input-code" },
  });
  await ensureField({
    collection: "ingestion_jobs",
    field: "result_count",
    type: "integer",
    meta: { interface: "input" },
  });
  await ensureField({
    collection: "ingestion_jobs",
    field: "created_by",
    type: "uuid",
    meta: {
      interface: "select-dropdown-m2o",
      special: ["m2o"],
    },
    schema: {
      foreign_key_table: "directus_users",
      foreign_key_column: "id",
    },
  });

  await ensureCollection("saved_scenes", { icon: "bookmark" });
  await ensureField({
    collection: "saved_scenes",
    field: "user_id",
    type: "uuid",
    meta: { interface: "select-dropdown-m2o", special: ["m2o"] },
    schema: {
      foreign_key_table: "directus_users",
      foreign_key_column: "id",
    },
  });
  await ensureField({
    collection: "saved_scenes",
    field: "scene_id",
    type: "uuid",
    meta: { interface: "select-dropdown-m2o", special: ["m2o"] },
    schema: {
      foreign_key_table: "scenes",
      foreign_key_column: "id",
    },
  });

  await ensureCollection("catalog_settings", { icon: "tune" });
  await ensureField({
    collection: "catalog_settings",
    field: "enabled_collection_ids",
    type: "json",
    meta: { interface: "tags", note: "STAC collection IDs allowed for search/ingest; empty = all" },
  });
  await ensureField({
    collection: "catalog_settings",
    field: "stac_search_url",
    type: "string",
    meta: { interface: "input", note: "Override STAC Item Search URL (optional)" },
  });
  await ensureField({
    collection: "catalog_settings",
    field: "default_cloud_cover",
    type: "integer",
    meta: { interface: "input" },
  });
  await ensureField({
    collection: "catalog_settings",
    field: "default_search_limit",
    type: "integer",
    meta: { interface: "input" },
  });
  await ensureField({
    collection: "catalog_settings",
    field: "bulk_ingest_max_items",
    type: "integer",
    meta: { interface: "input" },
  });
  await ensureField({
    collection: "catalog_settings",
    field: "date_range_days_default",
    type: "integer",
    meta: { interface: "input" },
  });

  console.log("Directus schema bootstrap complete (or already present).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
