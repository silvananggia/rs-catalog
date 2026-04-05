import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-api";
import { listDirectusRoles } from "@/lib/directus";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const roles = await listDirectusRoles();
    return NextResponse.json({ roles });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to list roles";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
