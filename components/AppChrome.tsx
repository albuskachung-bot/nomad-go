"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/Header";

export default function AppChrome({
  children,
  footer
}: {
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin");
  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isEmployerRoute = pathname.startsWith("/employer");

  if (isAdminRoute || isDashboardRoute || isEmployerRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <main>{children}</main>
      {footer}
    </>
  );
}
