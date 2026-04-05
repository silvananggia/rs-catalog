import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE, getUserRole } from "@/lib/auth";
import { getCurrentUser, listJobsForUserRole } from "@/lib/directus";

export async function GET() {
  const token = cookies().get(AUTH_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getCurrentUser(token);
  const role = await getUserRole(token);
  if (!user || !role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (role === "viewer") {
    return NextResponse.json({ jobs: [] });
  }

  const jobs = await listJobsForUserRole(user.id, role);
  return NextResponse.json({ jobs });
}
