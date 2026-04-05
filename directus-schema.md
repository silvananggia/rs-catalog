# Directus data model

Environment: PostgreSQL behind Directus. Create these collections in Directus (or run `npm run seed:directus` with `DIRECTUS_ADMIN_TOKEN`).

## Roles (Directus Admin UI)

| Name     | App role | Capabilities                                      |
|----------|----------|---------------------------------------------------|
| Admin    | `admin`  | Full CRUD, users, bulk ingest                     |
| Analyst  | `analyst`| STAC search, save scenes, own ingestion jobs    |
| Viewer   | `viewer` | Read `scenes` and `saved_scenes` only           |

Map role **names** so `lib/auth.ts` `mapDirectusRoleNameToRole` recognizes them (substring match on `admin`, `analyst`; else viewer).

## Collection: `scenes`

| Field               | Type     | Notes                                      |
|---------------------|----------|--------------------------------------------|
| id                  | uuid     | Primary key, auto                          |
| scene_id            | string   | Unique; STAC item id                       |
| collection          | string   | Dropdown: sentinel-2, landsat, worldview, pleiades |
| datetime            | datetime |                                            |
| cloud_cover         | float    | 0–100                                      |
| bbox                | json     | `[minX, minY, maxX, maxY]`                 |
| footprint           | json     | GeoJSON Polygon Feature or raw Polygon     |
| thumbnail_url       | string   | nullable                                   |
| assets              | json     | nullable; omit for HR scenes in app          |
| provider            | string   |                                            |
| resolution          | float    | meters per pixel                           |
| is_high_resolution  | boolean  | HR preview requires `/api/highres/...`      |
| created_by          | uuid     | M2O → `directus_users`                     |

**Permissions:** Admin all; Analyst create/read/update own; Viewer read.

## Collection: `ingestion_jobs`

| Field         | Type     | Notes                                |
|---------------|----------|--------------------------------------|
| id            | uuid     | Primary key                          |
| status        | string   | Dropdown: queued, running, done, failed |
| query_params  | json     | STAC search parameters               |
| result_count  | integer  |                                      |
| created_at    | datetime | Auto `create` timestamp              |
| created_by    | uuid     | M2O → `directus_users` (analyst scope) |

**Permissions:** Admin all; Analyst create/read own; Viewer read none (or read-only if you prefer).

## Collection: `saved_scenes`

| Field    | Type | Notes            |
|----------|------|------------------|
| id       | uuid | Primary key      |
| user_id  | uuid | M2O → users      |
| scene_id | uuid | M2O → `scenes`   |

**Permissions:** Admin all; Analyst CRUD own rows; Viewer read.

## JWT

Set `DIRECTUS_SECRET` in this app to the same value as Directus `SECRET` (JWT signing) so cookies can be verified in `middleware.ts` and `lib/auth.ts`.
