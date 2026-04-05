import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { AUTH_COOKIE, verifyDirectusJwt } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = cookies().get(AUTH_COOKIE)?.value;
  const session = token ? await verifyDirectusJwt(token) : null;
  if (!session) {
    const from = headers().get("x-pathname") ?? "/dashboard";
    redirect(`/login?from=${encodeURIComponent(from)}`);
  }

  return <AppShell>{children}</AppShell>;
}
