import { jwtVerify } from "jose";
import type { Role } from "./types";

const COOKIE_NAME = "directus_access_token";

export const AUTH_COOKIE = COOKIE_NAME;

function getJwtSecret(): Uint8Array {
  const secret = process.env.DIRECTUS_SECRET;
  if (!secret) {
    throw new Error("DIRECTUS_SECRET is not configured");
  }
  return new TextEncoder().encode(secret);
}

export async function verifyDirectusJwt(
  token: string
): Promise<{ sub: string; role?: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    const sub = typeof payload.id === "string" ? payload.id : payload.sub;
    if (typeof sub !== "string") return null;
    const role =
      typeof payload.role === "string" ? payload.role : undefined;
    return { sub, role };
  } catch {
    return null;
  }
}

/**
 * Maps Directus role name (from /users/me) to application Role.
 */
export function mapDirectusRoleNameToRole(name: string | undefined | null): Role {
  const n = (name ?? "").toLowerCase();
  if (n.includes("admin")) return "admin";
  if (n.includes("analyst")) return "analyst";
  return "viewer";
}

export async function getUserRole(token: string): Promise<Role | null> {
  const verified = await verifyDirectusJwt(token);
  if (!verified) return null;

  const base = process.env.NEXT_PUBLIC_DIRECTUS_URL;
  if (!base) {
    throw new Error("NEXT_PUBLIC_DIRECTUS_URL is not configured");
  }

  const res = await fetch(
    `${base.replace(/\/$/, "")}/users/me?fields=id,email,role.name`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }
  );

  if (!res.ok) return null;

  const body = (await res.json()) as {
    data?: {
      role?: { name?: string } | string | null;
    };
  };

  const roleField = body.data?.role;
  const roleName =
    typeof roleField === "object" && roleField !== null && "name" in roleField
      ? roleField.name
      : undefined;

  return mapDirectusRoleNameToRole(roleName);
}

export function roleCanIngest(role: Role): boolean {
  return role === "admin" || role === "analyst";
}

export function roleCanViewHighRes(role: Role): boolean {
  return role === "admin" || role === "analyst";
}

export function roleCanSaveScenes(role: Role): boolean {
  return role === "admin" || role === "analyst";
}
