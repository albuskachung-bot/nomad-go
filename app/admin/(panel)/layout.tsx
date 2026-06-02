import { redirect } from "next/navigation";
import { getCurrentAdminContext } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminPanelLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, isAdmin } = await getCurrentAdminContext();

  if (!user) {
    redirect("/admin/login");
  }

  if (!isAdmin) {
    redirect("/");
  }

  return children;
}
