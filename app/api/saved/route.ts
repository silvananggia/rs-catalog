import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE, roleCanSaveScenes } from "@/lib/auth";
import {
  createSavedScene,
  getCurrentUser,
  listSavedScenesForUser,
  upsertScene,
} from "@/lib/directus";
import type { NormalizedScene } from "@/lib/types";

export async function GET() {
  const token = cookies().get(AUTH_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getCurrentUser(token);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const saved = await listSavedScenesForUser(user.id, token);
  return NextResponse.json({ saved });
}

export async function POST(request: Request) {
  const token = cookies().get(AUTH_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getCurrentUser(token);
  if (!user || !roleCanSaveScenes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { scene?: NormalizedScene };
  try {
    body = (await request.json()) as { scene?: NormalizedScene };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.scene?.scene_id) {
    return NextResponse.json({ error: "scene required" }, { status: 400 });
  }

  const rowId = await upsertScene(body.scene, user.id);
  const saved = await createSavedScene(user.id, rowId, token);

  return NextResponse.json({ saved });
}
