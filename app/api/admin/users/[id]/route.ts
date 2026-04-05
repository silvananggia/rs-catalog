import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-api";
import { updateDirectusUserRole } from "@/lib/directus";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: { roleId?: string };
  try {
    body = (await request.json()) as { roleId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.roleId || typeof body.roleId !== "string") {
    return NextResponse.json({ error: "roleId required" }, { status: 400 });
  }

  try {
    await updateDirectusUserRole(params.id, body.roleId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
