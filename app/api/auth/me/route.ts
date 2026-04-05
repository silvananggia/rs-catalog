import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE } from "@/lib/auth";
import { getCurrentUser } from "@/lib/directus";

export async function GET() {
  const token = cookies().get(AUTH_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ user: null });
  }

  const user = await getCurrentUser(token);
  return NextResponse.json({ user: user ?? null });
}
