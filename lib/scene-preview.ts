import type { NormalizedScene } from "@/lib/types";

/**
 * URL for list/detail thumbnails and map image overlay.
 * High-resolution scenes use the signed API route when authenticated.
 */
export function getScenePreviewImageUrl(
  scene: NormalizedScene,
  isAuthenticated: boolean
): string | null {
  if (scene.is_high_resolution) {
    return isAuthenticated
      ? `/api/highres/${encodeURIComponent(scene.scene_id)}`
      : null;
  }
  return scene.thumbnail_url;
}
