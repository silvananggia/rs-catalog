import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE, verifyDirectusJwt } from "@/lib/auth";
import type { NormalizedScene } from "@/lib/types";

type LinkRow = { scene_id: string; label: string; href: string };

function collectLinks(scene: NormalizedScene): LinkRow[] {
  const rows: LinkRow[] = [];
  if (scene.thumbnail_url) {
    rows.push({
      scene_id: scene.scene_id,
      label: "Thumbnail",
      href: scene.thumbnail_url,
    });
  }
  if (scene.assets && typeof scene.assets === "object") {
    for (const [key, val] of Object.entries(
      scene.assets as Record<string, { href?: string }>
    )) {
      const href = val?.href;
      if (typeof href === "string" && href.length > 0) {
        rows.push({ scene_id: scene.scene_id, label: key, href });
      }
    }
  }
  return rows;
}

export async function POST(request: Request) {
  const token = cookies().get(AUTH_COOKIE)?.value;
  if (!token) {
    return NextResponse.json(
      { error: "Sign in required to access downloads" },
      { status: 401 }
    );
  }

  const session = await verifyDirectusJwt(token);
  if (!session) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  let body: { scenes?: NormalizedScene[] };
  try {
    body = (await request.json()) as { scenes?: NormalizedScene[] };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const scenes = body.scenes;
  if (!Array.isArray(scenes) || scenes.length === 0) {
    return NextResponse.json({ error: "scenes array required" }, { status: 400 });
  }

  if (scenes.length > 200) {
    return NextResponse.json({ error: "Too many scenes (max 200)" }, { status: 400 });
  }

  const items: LinkRow[] = [];
  for (const scene of scenes) {
    if (!scene?.scene_id) continue;
    items.push(...collectLinks(scene));
  }

  return NextResponse.json({ items });
}
