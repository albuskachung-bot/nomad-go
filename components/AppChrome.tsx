"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin");
  const isDashboardRoute = pathname.startsWith("/dashboard");

  if (isAdminRoute || isDashboardRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}
