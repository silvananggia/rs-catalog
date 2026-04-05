import { cookies } from "next/headers";
import { AUTH_COOKIE } from "@/lib/auth";

export function getSessionToken(): string | undefined {
  return cookies().get(AUTH_COOKIE)?.value;
}
