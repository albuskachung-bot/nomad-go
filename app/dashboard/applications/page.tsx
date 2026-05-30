import { redirect } from "next/navigation";

export default function LegacyDashboardApplicationsPage() {
  redirect("/dashboard/nomad/applications");
}
