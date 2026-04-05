import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE, getUserRole, roleCanViewHighRes } from "@/lib/auth";
import { getSceneBySceneId } from "@/lib/directus";

export async function GET(
  _request: Request,
  context: { params: Promise<{ scene_id: string }> }
) {
  const token = cookies().get(AUTH_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getUserRole(token);
  if (!role || !roleCanViewHighRes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { scene_id: rawId } = await context.params;
  const sceneId = decodeURIComponent(rawId);
  const scene = await getSceneBySceneId(sceneId);

  if (!scene || !scene.is_high_resolution) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const providerBase = process.env.HIGHRES_PROVIDER_BASE_URL;
  const apiKey = process.env.PROVIDER_API_KEY;

  if (!providerBase || !apiKey) {
    if (scene.thumbnail_url) {
      return NextResponse.redirect(scene.thumbnail_url);
    }
    return NextResponse.json(
      { error: "High-res provider not configured" },
      { status: 503 }
    );
  }

  const url = `${providerBase.replace(/\/$/, "")}/scenes/${encodeURIComponent(scene.scene_id)}/preview`;

  const upstream = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json, image/*, */*",
    },
    cache: "no-store",
  });

  if (!upstream.ok) {
    return NextResponse.json(
      { error: "Provider error" },
      { status: 502 }
    );
  }

  const ct = upstream.headers.get("content-type") ?? "";

  if (ct.includes("application/json")) {
    const data = (await upstream.json()) as { previewUrl?: string };
    if (data.previewUrl) {
      return NextResponse.redirect(data.previewUrl);
    }
    return NextResponse.json({ error: "Invalid provider response" }, { status: 502 });
  }

  const buf = await upstream.arrayBuffer();
  return new NextResponse(buf, {
    headers: {
      "Content-Type": ct || "image/jpeg",
      "Cache-Control": "private, max-age=300",
    },
  });
}
