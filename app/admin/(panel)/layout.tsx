import { redirect } from "next/navigation";
import { getCurrentAdminContext } from "@/lib/admin";

export default async function AdminPanelLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { profile } = await getCurrentAdminContext();

  if (profile?.role !== "super_admin" && profile?.role !== "editor") {
    redirect("/");
  }

  return children;
}
