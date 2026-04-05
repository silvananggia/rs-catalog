import type { NormalizedScene } from "@/lib/types";

/**
 * Base URL for TiTiler (no trailing slash).
 * Defaults to the public demo instance; override with `NEXT_PUBLIC_TITILER_URL`.
 * Set `NEXT_PUBLIC_TITILER_URL=0` to disable TiTiler tiles (fallback to static preview only).
 */
export function getTitilerBaseUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_TITILER_URL;
  if (raw === "0" || raw === "false" || raw === "") return null;
  return (raw ?? "https://titiler.xyz").replace(/\/$/, "");
}

/** TiTiler ≥0.18: WebMercatorQuad matches OpenLayers XYZ. */
const DEFAULT_TILE_PATH =
  "/cog/tiles/WebMercatorQuad/{z}/{x}/{y}";

/**
 * XYZ URL template for OpenLayers `ol/source/XYZ` (`{z}` `{x}` `{y}`).
 */
export function buildTitilerXyzUrlFromCog(cogUrl: string): string | null {
  const base = getTitilerBaseUrl();
  if (!base) return null;
  const path =
    process.env.NEXT_PUBLIC_TITILER_COG_TILES_PATH?.trim() || DEFAULT_TILE_PATH;
  const qs = new URLSearchParams({ url: cogUrl });
  return `${base}${path}?${qs.toString()}`;
}

/**
 * Prefer STAC assets that are COG / GeoTIFF suitable for TiTiler.
 */
export function pickCogHrefForTitiler(scene: NormalizedScene): string | null {
  if (!scene.assets || scene.is_high_resolution) return null;
  const assets = scene.assets as Record<
    string,
    { href?: string; type?: string; roles?: string[] }
  >;

  const preferredKeys = [
    "visual",
    "true-color",
    "rgb",
    "cog",
    "image",
  ] as const;

  for (const key of preferredKeys) {
    const a = assets[key];
    const href = a?.href;
    if (href?.startsWith("http")) return href;
  }

  for (const [, v] of Object.entries(assets)) {
    const href = v?.href;
    if (!href?.startsWith("http")) continue;
    const t = (v.type ?? "").toLowerCase();
    if (
      t.includes("tiff") ||
      t.includes("geotiff") ||
      t.includes("jpeg2000") ||
      t.includes("jp2")
    ) {
      return href;
    }
    if (/\.(tif|tiff|jp2)(\?|$)/i.test(href)) return href;
  }

  return null;
}
