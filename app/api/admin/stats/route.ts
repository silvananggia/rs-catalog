import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-api";
import { countScenesAdmin, listIngestionJobs } from "@/lib/directus";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const [sceneCount, jobs] = await Promise.all([
      countScenesAdmin(),
      listIngestionJobs(5000),
    ]);
    return NextResponse.json({
      sceneCount,
      ingestionJobCount: jobs.length,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Stats failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
