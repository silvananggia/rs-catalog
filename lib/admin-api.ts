import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE, getUserRole, roleCanAdmin } from "@/lib/auth";
import type { Role } from "@/lib/types";

export async function requireAdmin(): Promise<
  | { ok: true; token: string; role: Role }
  | { ok: false; response: NextResponse }
> {
  const token = cookies().get(AUTH_COOKIE)?.value;
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  const role = await getUserRole(token);
  if (!role || !roleCanAdmin(role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { ok: true, token, role };
}
