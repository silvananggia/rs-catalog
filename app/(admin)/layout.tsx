import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { AUTH_COOKIE, getUserRole, roleCanAdmin } from "@/lib/auth";

/** Layout terpisah untuk `/admin` — tidak memakai `AppShell` workspace. */
export default async function AdminGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = cookies().get(AUTH_COOKIE)?.value;
  if (!token) {
    redirect("/login?from=/admin");
  }
  const role = await getUserRole(token);
  if (!role || !roleCanAdmin(role)) {
    redirect("/dashboard");
  }

  return <AdminShell>{children}</AdminShell>;
}
