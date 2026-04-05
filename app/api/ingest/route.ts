import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  AUTH_COOKIE,
  getUserRole,
  roleCanIngest,
} from "@/lib/auth";
import { getMergedCatalogSettings } from "@/lib/catalog-settings-server";
import { resolveStacSearchUrl } from "@/lib/catalog-settings";
import {
  batchInsertScenes,
  createIngestionJob,
  listScenesBySceneIds,
  updateIngestionJob,
} from "@/lib/directus";
import { searchSTAC, searchSTACPaginated } from "@/lib/stac";
import type { IngestRequestBody } from "@/lib/types";

const CHUNK = 50;

export async function POST(request: Request) {
  const token = cookies().get(AUTH_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getUserRole(token);
  if (!role || !roleCanIngest(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: IngestRequestBody;
  try {
    body = (await request.json()) as IngestRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const verified = await import("@/lib/auth").then((m) =>
    m.verifyDirectusJwt(token)
  );
  const userId = verified?.sub ?? null;

  const settings = await getMergedCatalogSettings();
  const stacOpts = {
    stacSearchUrl: resolveStacSearchUrl(settings),
    enabledCollectionIds: settings.enabledCollectionIds,
  };
  const query = {
    ...body.query,
    limit: body.query.limit ?? settings.defaultSearchLimit,
  };

  const job = await createIngestionJob(query, userId);
  await updateIngestionJob(job.id, { status: "running" });

  try {
    const normalized =
      body.mode === "bulk"
        ? await searchSTACPaginated(
            { ...query, limit: Math.min(query.limit ?? 100, 100) },
            settings.bulkIngestMaxItems,
            stacOpts
          )
        : await searchSTAC(query, stacOpts);

    const ids = normalized.map((n) => n.scene_id);
    const existing = await listScenesBySceneIds(ids);
    const fresh = normalized.filter((n) => !existing.has(n.scene_id));

    let inserted = 0;
    for (let i = 0; i < fresh.length; i += CHUNK) {
      const chunk = fresh.slice(i, i + CHUNK);
      await batchInsertScenes(chunk, userId);
      inserted += chunk.length;
    }

    const skipped = normalized.length - inserted;

    await updateIngestionJob(job.id, {
      status: "done",
      result_count: normalized.length,
    });

    return NextResponse.json({
      jobId: job.id,
      inserted,
      skipped,
      status: "done" as const,
    });
  } catch (e) {
    await updateIngestionJob(job.id, { status: "failed" });
    const msg = e instanceof Error ? e.message : "Ingest failed";
    return NextResponse.json({ error: msg, jobId: job.id }, { status: 500 });
  }
}
