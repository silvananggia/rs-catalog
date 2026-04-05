import { fromUrl } from "geotiff";
import type { NormalizedScene } from "./types";

function findBandHref(
  scene: NormalizedScene,
  patterns: string[]
): string | null {
  if (!scene.assets || scene.is_high_resolution) return null;
  const assets = scene.assets as Record<
    string,
    { href?: string; roles?: string[] }
  >;
  for (const [key, asset] of Object.entries(assets)) {
    const lower = key.toLowerCase();
    for (const p of patterns) {
      if (lower.includes(p)) return asset.href ?? null;
    }
  }
  return null;
}

export function sceneSupportsNdvi(scene: NormalizedScene): boolean {
  if (scene.is_high_resolution) return false;
  const c = scene.collection;
  if (c !== "sentinel-2" && c !== "landsat") return false;
  const nir = findBandHref(scene, ["nir", "b08", "b8"]);
  const red = findBandHref(scene, ["red", "b04", "b4"]);
  return Boolean(nir && red);
}

/**
 * Computes NDVI from COG assets (NIR + Red). Uses a small overview window for preview.
 */
export async function computeNDVI(scene: NormalizedScene): Promise<ImageData> {
  const redUrl = findBandHref(scene, ["red", "b04", "b4"]);
  const nirUrl = findBandHref(scene, ["nir", "b08", "b8"]);
  if (!redUrl || !nirUrl) {
    throw new Error("Missing red/NIR assets for NDVI");
  }

  const [redTiff, nirTiff] = await Promise.all([
    fromUrl(redUrl),
    fromUrl(nirUrl),
  ]);
  const redImg = await redTiff.getImage();
  const nirImg = await nirTiff.getImage();
  const w = Math.min(redImg.getWidth(), nirImg.getWidth(), 512);
  const h = Math.min(redImg.getHeight(), nirImg.getHeight(), 512);

  const redRasters = await redImg.readRasters({
    window: [0, 0, w, h],
    interleave: true,
  });
  const nirRasters = await nirImg.readRasters({
    window: [0, 0, w, h],
    interleave: true,
  });
  const redData = redRasters[0] as unknown as ArrayLike<number>;
  const nirData = nirRasters[0] as unknown as ArrayLike<number>;

  const out = new ImageData(w, h);
  const len = w * h;

  for (let i = 0; i < len; i++) {
    const r = Number(redData[i] ?? 0) / 10000;
    const n = Number(nirData[i] ?? 0) / 10000;
    const ndvi = n + r === 0 ? 0 : (n - r) / (n + r);
    const t = (ndvi + 1) / 2;
    const brown = [101, 67, 33];
    const green = [34, 197, 94];
    const rr = Math.round(brown[0] + (green[0] - brown[0]) * t);
    const gg = Math.round(brown[1] + (green[1] - brown[1]) * t);
    const bb = Math.round(brown[2] + (green[2] - brown[2]) * t);
    const o = i * 4;
    out.data[o] = rr;
    out.data[o + 1] = gg;
    out.data[o + 2] = bb;
    out.data[o + 3] = 255;
  }

  return out;
}
