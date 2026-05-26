import { redirect } from "next/navigation";

export default function DeprecatedProfileApplicationsPage() {
  redirect("/dashboard/nomad/applications");
}
